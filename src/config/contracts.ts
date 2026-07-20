import { zeroAddress, type Address } from 'viem'
import { baseSepolia } from './wagmi'
import deployments from './deployments.json'

/**
 * Contract wiring.
 *
 * `deployments.json` is overwritten by `forge script script/Deploy.s.sol
 * --broadcast` (see contracts/script/Deploy.s.sol). While every address is the
 * zero address the UI runs in DEMO MODE with simulated data, so the interface
 * can be explored before (or without) deploying.
 */

export const CHAIN = baseSepolia
export const CHAIN_ID = baseSepolia.id // 84532
export const EXPLORER = 'https://sepolia.basescan.org'

const ZERO = zeroAddress

export const ADDRESSES = {
  mUSDC: deployments.mUSDC as Address,
  mETH: deployments.mETH as Address,
  pair: deployments.pair as Address,
  vault: deployments.vault as Address,
}

/** True until real deployment addresses are written to deployments.json. */
export const DEMO_MODE = ADDRESSES.pair === ZERO || ADDRESSES.vault === ZERO

export interface TokenMeta {
  symbol: string
  name: string
  decimals: number
  address: Address
  /** Brand colors used for token icons / charts */
  color: string
  gradient: string
}

export const TOKENS = {
  mUSDC: {
    symbol: 'mUSDC',
    name: 'Mock USD Coin',
    decimals: 18,
    address: ADDRESSES.mUSDC,
    color: '#2775ca',
    gradient: 'from-blue-500 to-cyan-400',
  },
  mETH: {
    symbol: 'mETH',
    name: 'Mock Ether',
    decimals: 18,
    address: ADDRESSES.mETH,
    color: '#8a9cff',
    gradient: 'from-indigo-400 to-purple-500',
  },
} as const

export type TokenSymbol = keyof typeof TOKENS

// ---------------------------------------------------------------------------
// ABIs (hand-mirrored from contracts/src — keep in sync when contracts change)
// ---------------------------------------------------------------------------

export const mockErc20Abi = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'faucet', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'faucetAmount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'faucetCooldownRemaining', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'FAUCET_COOLDOWN', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const

export const pairAbi = [
  { name: 'token0', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'token1', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'getReserves', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'reserve0', type: 'uint112' }, { name: 'reserve1', type: 'uint112' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  {
    name: 'quote', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'amountA', type: 'uint256' }, { name: 'reserveA', type: 'uint256' }, { name: 'reserveB', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getAmountOut', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'reserveIn', type: 'uint256' }, { name: 'reserveOut', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'addLiquidity', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount0Desired', type: 'uint256' }, { name: 'amount1Desired', type: 'uint256' },
      { name: 'amount0Min', type: 'uint256' }, { name: 'amount1Min', type: 'uint256' },
      { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amount0', type: 'uint256' }, { name: 'amount1', type: 'uint256' }, { name: 'liquidity', type: 'uint256' }],
  },
  {
    name: 'removeLiquidity', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'liquidity', type: 'uint256' }, { name: 'amount0Min', type: 'uint256' }, { name: 'amount1Min', type: 'uint256' },
      { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amount0', type: 'uint256' }, { name: 'amount1', type: 'uint256' }],
  },
  {
    name: 'swapExactIn', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIn', type: 'address' }, { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    name: 'Swap', type: 'event',
    inputs: [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'amount0In', type: 'uint256', indexed: false },
      { name: 'amount1In', type: 'uint256', indexed: false },
      { name: 'amount0Out', type: 'uint256', indexed: false },
      { name: 'amount1Out', type: 'uint256', indexed: false },
      { name: 'to', type: 'address', indexed: true },
    ],
  },
] as const

export const vaultAbi = [
  { name: 'asset', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'totalAssets', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'apyBps', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'rewardRate', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'pendingYield', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'convertToShares', type: 'function', stateMutability: 'view', inputs: [{ name: 'assets', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'convertToAssets', type: 'function', stateMutability: 'view', inputs: [{ name: 'shares', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'maxWithdraw', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'maxRedeem', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  {
    name: 'deposit', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'assets', type: 'uint256' }, { name: 'receiver', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'withdraw', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'assets', type: 'uint256' }, { name: 'receiver', type: 'address' }, { name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'redeem', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'shares', type: 'uint256' }, { name: 'receiver', type: 'address' }, { name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  // underlying mUSDC approval (used via mockErc20Abi on the asset address)
] as const
