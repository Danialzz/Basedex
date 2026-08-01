# Deployment guide

From zero to a live dapp on Base Sepolia in ~10 minutes.

## 0. Prerequisites

- Node 20+ (`node -v`)
- Foundry (`forge --version`) — install: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- A **throwaway** wallet private key (export from MetaMask: Account details → Show private key).
  Never use a key that holds real funds.
- Base Sepolia ETH on that key for gas (~0.001 ETH is plenty):
  - [Coinbase faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet) (official)
  - [Superchain faucet](https://console.optimism.io/faucet) (sign in with GitHub)
  - [Alchemy faucet](https://www.alchemy.com/faucets/base-sepolia)

## 1. Install & build

```bash
git clone --recurse-submodules https://github.com/Danialzz/Basedex.git
cd Basedex
npm install
cd contracts && forge build && forge test
```

## 2. Configure the deployer

```bash
cd ..                    # repo root
cp .env.example .env
```

Edit `.env`:

```dotenv
PRIVATE_KEY=0xYOUR_TESTNET_KEY
# optional, for contract verification:
BASESCAN_API_KEY=...
# optional, custom RPC:
VITE_RPC_URL=https://base-sepolia.g.alchemy.com/v2/...
```

> A free Basescan API key: basescan.org → sign up → API-KEYs → Add.

## 3. Deploy

```bash
source .env
cd contracts
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
```

Expected output:

```
Deployer: 0xYourAddress
Chain ID: 84532
mUSDC:      0x…
mETH:       0x…
SimplePair: 0x…
YieldVault: 0x…
Wrote deployments/latest.json and src/config/deployments.json
```

Add `--verify` to also verify the source on Basescan (requires `BASESCAN_API_KEY`).
If verification partially fails, re-run — already-verified contracts are skipped.

## 4. Run the live frontend

```bash
cd ..
npm run dev      # development
# or
npm run build && npm run preview   # production bundle
```

The app detects the addresses in `src/config/deployments.json` and leaves demo mode:
the header no longer shows the "Demo mode" pill, and all stats come from the chain.

## 5. Verify everything works

| Check         | Where      | Expected                                                |
| ------------- | ---------- | ------------------------------------------------------- |
| Faucet claim  | Faucet tab | 1,000 mUSDC lands in your wallet                        |
| Swap          | Swap tab   | Quote appears, tx confirms, chart gets a point          |
| Add liquidity | Pool tab   | LP tokens appear in "Your pool share"                   |
| Vault deposit | Earn tab   | bvUSD shares minted; share price > 1 over time          |
| Contracts     | Basescan   | `sepolia.basescan.org/address/<pair>` shows code & txns |

## 6. Share it

Commit and push the updated `src/config/deployments.json` so anyone cloning the repo
gets a live frontend out of the box:

```bash
git add src/config/deployments.json contracts/deployments/latest.json
git commit -m "Deploy to Base Sepolia"
git push
```

Host the static build (`dist/`) on GitHub Pages, Vercel, Netlify or IPFS — no server
required.

## Troubleshooting

- **`insufficient funds`** — the deployer key needs Base Sepolia ETH (step 0).
- **`FaucetOnCooldown`** — each token is claimable once per 24h per address.
- **Frontend still says "Demo mode"** — the deploy script must finish step 5; check
  that `src/config/deployments.json` contains non-zero addresses, then restart the
  dev server.
- **Stale quotes** — reads poll every 15s; a hard refresh forces an immediate refetch.
- **Rate-limited RPC** — set `VITE_RPC_URL` to a dedicated Alchemy/QuickNode endpoint.
