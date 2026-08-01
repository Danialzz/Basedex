# Architecture deep-dive

This document explains how the pieces of BaseDex fit together and the reasoning behind
the key design decisions.

## 1. System overview

```
Browser ──► React app ──► wagmi/viem ──► Base Sepolia JSON-RPC
                              ▲
                              │ src/config/deployments.json
                              │ (addresses, written at deploy time)
                              │
Foundry: forge script Deploy.s.sol ──► deploys & seeds contracts
```

The frontend is a pure static site: no backend, no database, no indexer. All state comes
from the chain via batched `eth_call`s (`useReadContracts`) and event logs
(`eth_getLogs`). This keeps hosting trivial (any static host: GitHub Pages, Vercel,
IPFS) and makes the whole stack auditable end to end.

## 2. Smart contracts

### 2.1 MockERC20 — demo liquidity

Two tokens back the demo economy:

| Token | Role                                | Faucet      | Decimals |
| ----- | ----------------------------------- | ----------- | -------- |
| mUSDC | stable leg of the pair, vault asset | 1,000 / 24h | 18       |
| mETH  | volatile leg of the pair            | 0.25 / 24h  | 18       |

Both use 18 decimals to keep AMM and vault math uniform (the frontend reads decimals
from token metadata, so switching to 6-decimal USDC later is a config change).

The **minter role** (`setMinter`/`mint`) exists so protocol contracts can mint — the
yield vault uses it to simulate yield. On mainnet you would delete the faucet and never
grant mint rights to a yield source; here it replaces a lending market.

### 2.2 SimplePair — the AMM

A single constant-product pool modelled directly on Uniswap V2:

- **Reserves** cached in `uint112` storage slots, updated (`_update`) after every state
  change; token order fixed at construction (`token0 < token1`).
- **LP token** is the pair contract itself (ERC20 inheritance), like `UniswapV2Pair`.
  First mint locks `MINIMUM_LIQUIDITY = 1000` units to `0xdead` to neutralize the
  first-depositor share inflation vector.
- **Fee**: 0.30%, enforced by the adjusted invariant check
  `(balance·1000 − amountIn·3)` per side — the same identity Uniswap uses, so fees
  accrue to LPs by growing `k`.
- **Two swap entry points**:
  - `swap(amount0Out, amount1Out, to)` — low-level, transfer-in-first (flash-swap
    compatible shape), mirrors Uniswap V2;
  - `swapExactIn(tokenIn, amountIn, minOut, to, deadline)` — the UX path the frontend
    uses: computes the quote from cached reserves, pulls tokens via `transferFrom`,
    delegates to the same core `_swap` routine (single source of truth for the
    invariant).
- **Safety**: `nonReentrant` on all mutating entry points, deadline checks, slippage
  bounds (`amountMin` parameters), `InvalidTo` guard against sending to token
  addresses, and SafeERC20 throughout.

What was intentionally left out (documented in README roadmap): factory/router
contracts (single pool only), TWAP oracle accumulators, protocol fee switch, and
flash-loan data callback execution.

### 2.3 YieldVault — ERC-4626

An OpenZeppelin ERC-4626 vault over mUSDC:

- **Emission model**: `rewardRate` (asset wei/second) set by the owner. Yield accrues
  linearly: `pendingYield() = rewardRate · (now − lastAccrual)`.
- **`totalAssets()` override** includes pending (not-yet-minted) yield, so
  `convertToShares`/`convertToAssets` and all previews are exact _between_ accruals —
  deposits and withdrawals first call `_accrue()`, which mints the pending amount into
  the vault (it holds the token's minter role) and timestamps the accrual.
- **`apyBps()`** derives the instantaneous APY: `rewardRate · 365d · 10_000 /
totalAssets()`. The default rate (≈3.17e15 wei/s) targets ~10% APY at 1M mUSDC TVL.
- Changing the rate (`setRewardRate`) accrues first so old-rate yield is fully
  accounted; `accrue()` is permissionless so anyone (a keeper) can poke the vault.

Why simulated yield? A real yield adapter (depositing into Aave/Morpho) adds external
protocol risk and deployment complexity that distracts from the teaching goal. The
share-accounting semantics users interact with — deposits, share price drift,
withdrawals of principal+yield — are byte-for-byte the real ERC-4626 experience.

## 3. Frontend architecture

### 3.1 Config-driven demo/live switch

`src/config/deployments.json` is the single source of truth for contract addresses:

- All-zero addresses ⇒ `DEMO_MODE = true` ⇒ hooks return deterministic simulated data
  (`src/lib/demo.ts`), and `useTxAction` converts write attempts into explanatory
  toasts. The UI is fully explorable with no chain at all.
- Real addresses (written by the deploy script) ⇒ hooks switch to batched on-chain
  reads with 15s polling, and every button executes real transactions.

### 3.2 Data flow

```
useProtocolData()  ── one hook, all app state:
  protocol reads (7)  : reserves, LP supply, TVL, apyBps, share price, faucet sizes
  wallet reads   (10) : balances, allowances, shares, cooldowns  (enabled when connected)
usePriceHistory()  ── Swap event logs → execution-price series (falls back to demo series)
useTxAction()      ── demo guard → chain switch → write → receipt → toast + refetch
```

Quotes are computed **locally** (`getAmountOut` mirrored in TS) from the polled
reserves — no RPC call per keystroke, and results are identical to on-chain execution
because reserves only change every ~2s block.

### 3.3 Wallet layer

- wagmi v2 config with two connectors: `injected()` (MetaMask/Rabby/etc.) and
  `coinbaseWallet()` (Coinbase Smart Wallet, no extension required).
- Chain guard: connected-but-wrong-chain renders a "Switch to Base Sepolia" CTA;
  `useTxAction` also attempts `switchChain` before every write.
- RPC is `https://sepolia.base.org` by default, overridable with `VITE_RPC_URL`.

## 4. Deployment pipeline

`contracts/script/Deploy.s.sol` (see [DEPLOYMENT.md](DEPLOYMENT.md)):

1. Deploys mUSDC + mETH (10M initial supply each to the deployer).
2. Deploys `SimplePair(mUSDC, mETH)` and `YieldVault(mUSDC, rewardRate)`.
3. Grants the vault mUSDC's minter role.
4. Seeds the pool: 200,000 mUSDC + 100 mETH → implied 2,000 mUSDC/mETH.
5. Serializes all addresses → `contracts/deployments/latest.json` **and**
   `src/config/deployments.json` (via `fs_permissions` in `foundry.toml`).

Because step 5 feeds the frontend config, "deploy" and "wire up the UI" are the same
command — the next frontend build is automatically live-mode.

## 5. CI

`.github/workflows/ci.yml` runs two jobs on every push/PR:

- **contracts**: Foundry toolchain → `forge fmt --check`-friendly build → `forge test -vvv`
- **frontend**: Node 20 → `npm ci` → `npm run build` (tsc type-check + Vite bundle)
