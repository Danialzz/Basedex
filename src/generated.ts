/**
 * Contract ABIs — single source of truth for the frontend.
 *
 * This file is the output target of `npm run generate` (wagmi CLI), which
 * regenerates it from Foundry build artifacts (contracts/out/*.json) with full
 * type inference. Run `cd contracts && forge build && cd .. && npm run generate`
 * after changing any contract.
 *
 * The committed copy below is hand-mirrored from contracts/src so the frontend
 * type-checks and builds even when `forge` isn't available (CI, fresh clones).
 * It is kept in the exact `as const` shape wagmi generates, so swapping in the
 * generated version is a drop-in replacement.
 */

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
] as const
