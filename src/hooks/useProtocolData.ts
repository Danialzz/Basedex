import { useMemo } from 'react'
import { useAccount, useReadContracts } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { ADDRESSES, DEMO_MODE, mockErc20Abi, pairAbi, vaultAbi } from '@/config/contracts'
import { DEMO } from '@/lib/demo'

export interface ProtocolData {
  isDemo: boolean
  isLoading: boolean
  /** Pool state */
  reserveUsdc: bigint
  reserveMeth: bigint
  lpTotalSupply: bigint
  /** Spot price: mUSDC per 1 mETH */
  price: number
  /** Connected wallet state (undefined when wallet disconnected) */
  usdcBalance: bigint | undefined
  methBalance: bigint | undefined
  lpBalance: bigint | undefined
  allowanceUsdcPair: bigint | undefined
  allowanceMethPair: bigint | undefined
  allowanceLpPair: bigint | undefined
  allowanceUsdcVault: bigint | undefined
  /** Vault state */
  vaultTvl: bigint
  vaultApyBps: number
  /** mUSDC per 1 vault share (scaled 1e18) */
  sharePrice: bigint
  userVaultShares: bigint | undefined
  userVaultAssets: bigint | undefined
  /** Faucet */
  faucetUsdcAmount: bigint
  faucetMethAmount: bigint
  faucetUsdcCooldown: number
  faucetMethCooldown: number
  /** True when token0 of the pair is mUSDC (address ordering) */
  usdcIsToken0: boolean
  refetch: () => void
}

const d18 = (n: number) => parseUnits(n.toString(), 18)

/** mUSDC/mETH address ordering determines token0/token1 in the pair. */
const USDC_IS_TOKEN0 = ADDRESSES.mUSDC.toLowerCase() < ADDRESSES.mETH.toLowerCase()

export function useProtocolData(): ProtocolData {
  const { address } = useAccount()

  // ------------------------------------------------------------------
  // Protocol-level reads
  // ------------------------------------------------------------------
  const protocolReads = useReadContracts({
    allowFailure: false,
    query: { enabled: !DEMO_MODE, refetchInterval: 15_000 },
    contracts: [
      { address: ADDRESSES.pair, abi: pairAbi, functionName: 'getReserves' },
      { address: ADDRESSES.pair, abi: pairAbi, functionName: 'totalSupply' },
      { address: ADDRESSES.vault, abi: vaultAbi, functionName: 'totalAssets' },
      { address: ADDRESSES.vault, abi: vaultAbi, functionName: 'apyBps' },
      {
        address: ADDRESSES.vault,
        abi: vaultAbi,
        functionName: 'convertToAssets',
        args: [parseUnits('1', 18)],
      },
      { address: ADDRESSES.mUSDC, abi: mockErc20Abi, functionName: 'faucetAmount' },
      { address: ADDRESSES.mETH, abi: mockErc20Abi, functionName: 'faucetAmount' },
    ],
  })

  // ------------------------------------------------------------------
  // Wallet-level reads
  // ------------------------------------------------------------------
  const userReads = useReadContracts({
    allowFailure: false,
    query: { enabled: !DEMO_MODE && !!address, refetchInterval: 15_000 },
    contracts: address
      ? [
          {
            address: ADDRESSES.mUSDC,
            abi: mockErc20Abi,
            functionName: 'balanceOf',
            args: [address],
          },
          {
            address: ADDRESSES.mETH,
            abi: mockErc20Abi,
            functionName: 'balanceOf',
            args: [address],
          },
          { address: ADDRESSES.pair, abi: pairAbi, functionName: 'balanceOf', args: [address] },
          {
            address: ADDRESSES.mUSDC,
            abi: mockErc20Abi,
            functionName: 'allowance',
            args: [address, ADDRESSES.pair],
          },
          {
            address: ADDRESSES.mETH,
            abi: mockErc20Abi,
            functionName: 'allowance',
            args: [address, ADDRESSES.pair],
          },
          {
            address: ADDRESSES.pair,
            abi: pairAbi,
            functionName: 'allowance',
            args: [address, ADDRESSES.pair],
          },
          {
            address: ADDRESSES.mUSDC,
            abi: mockErc20Abi,
            functionName: 'allowance',
            args: [address, ADDRESSES.vault],
          },
          { address: ADDRESSES.vault, abi: vaultAbi, functionName: 'balanceOf', args: [address] },
          {
            address: ADDRESSES.mUSDC,
            abi: mockErc20Abi,
            functionName: 'faucetCooldownRemaining',
            args: [address],
          },
          {
            address: ADDRESSES.mETH,
            abi: mockErc20Abi,
            functionName: 'faucetCooldownRemaining',
            args: [address],
          },
        ]
      : [],
  })

  const data = useMemo<ProtocolData>(() => {
    if (DEMO_MODE) {
      return {
        isDemo: true,
        isLoading: false,
        reserveUsdc: d18(DEMO.reserveUsdc),
        reserveMeth: d18(DEMO.reserveMeth),
        lpTotalSupply: d18(DEMO.lpTotalSupply),
        price: DEMO.price,
        usdcBalance: d18(DEMO.userUsdc),
        methBalance: d18(DEMO.userMeth),
        lpBalance: d18(DEMO.userLpBalance),
        allowanceUsdcPair: 0n,
        allowanceMethPair: 0n,
        allowanceLpPair: 0n,
        allowanceUsdcVault: 0n,
        vaultTvl: d18(DEMO.vaultTvl),
        vaultApyBps: DEMO.vaultApyBps,
        sharePrice: d18(DEMO.sharePrice),
        userVaultShares: d18(DEMO.userVaultShares),
        userVaultAssets: d18(DEMO.userVaultShares * DEMO.sharePrice),
        faucetUsdcAmount: d18(DEMO.faucetUsdc),
        faucetMethAmount: d18(DEMO.faucetMeth),
        faucetUsdcCooldown: 0,
        faucetMethCooldown: 3600 * 5 + 60 * 12,
        usdcIsToken0: true,
        refetch: () => {},
      }
    }

    const p = protocolReads.data as
      [readonly [bigint, bigint], bigint, bigint, bigint, bigint, bigint, bigint] | undefined
    const u = userReads.data as
      [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] | undefined

    const [reserves, lpSupply, tvl, apyBps, sharePrice, fUsdc, fMeth] = p ?? [
      [0n, 0n] as const,
      0n,
      0n,
      0n,
      0n,
      0n,
      0n,
    ]

    const reserveUsdc = USDC_IS_TOKEN0 ? reserves[0] : reserves[1]
    const reserveMeth = USDC_IS_TOKEN0 ? reserves[1] : reserves[0]
    const price =
      reserveMeth > 0n
        ? Number(formatUnits(reserveUsdc, 18)) / Number(formatUnits(reserveMeth, 18))
        : 0

    return {
      isDemo: false,
      isLoading: protocolReads.isLoading,
      reserveUsdc,
      reserveMeth,
      lpTotalSupply: lpSupply,
      price,
      usdcBalance: u?.[0],
      methBalance: u?.[1],
      lpBalance: u?.[2],
      allowanceUsdcPair: u?.[3],
      allowanceMethPair: u?.[4],
      allowanceLpPair: u?.[5],
      allowanceUsdcVault: u?.[6],
      vaultTvl: tvl,
      vaultApyBps: Number(apyBps),
      sharePrice,
      userVaultShares: u?.[7],
      userVaultAssets:
        u?.[7] !== undefined && sharePrice > 0n
          ? (u[7] * sharePrice) / parseUnits('1', 18)
          : undefined,
      faucetUsdcAmount: fUsdc,
      faucetMethAmount: fMeth,
      faucetUsdcCooldown: Number(u?.[8] ?? 0n),
      faucetMethCooldown: Number(u?.[9] ?? 0n),
      usdcIsToken0: USDC_IS_TOKEN0,
      refetch: () => {
        protocolReads.refetch()
        userReads.refetch()
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocolReads.data, userReads.data, protocolReads.isLoading])

  return data
}
