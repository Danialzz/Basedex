import { zeroAddress, type Address } from 'viem'
import { baseSepolia } from './wagmi'
import deployments from './deployments.json'

// ABIs come from src/generated.ts (wagmi CLI output / committed fallback).
export { mockErc20Abi, pairAbi, vaultAbi } from '../generated'

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
