import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import { formatUnits, parseAbiItem } from 'viem'
import { ADDRESSES, DEMO_MODE } from '@/config/contracts'
import { DEMO_PRICE_HISTORY, type PricePoint } from '@/lib/demo'

const SWAP_EVENT = parseAbiItem(
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
)

/**
 * Price history for the mETH/mUSDC pool.
 *  - Demo mode: deterministic seeded series.
 *  - Live mode: execution prices of recent on-chain Swap events (last ~100k
 *    blocks, roughly 2–3 days on Base Sepolia). Empty array when no swaps
 *    have happened yet — the UI then shows a "make the first swap" state.
 */
export function usePriceHistory(usdcIsToken0: boolean) {
  const client = usePublicClient()

  const query = useQuery({
    enabled: !DEMO_MODE && !!client,
    queryKey: ['swap-price-history', ADDRESSES.pair],
    staleTime: 30_000,
    queryFn: async (): Promise<PricePoint[]> => {
      if (!client) return []
      try {
        const latest = await client.getBlockNumber()
        const fromBlock = latest > 99_000n ? latest - 99_000n : 0n
        const logs = await client.getLogs({
          address: ADDRESSES.pair,
          event: SWAP_EVENT,
          fromBlock,
          toBlock: latest,
        })
        const points: PricePoint[] = []
        for (const log of logs) {
          const { amount0In, amount1In, amount0Out, amount1Out } = log.args
          let usdcIn = 0n
          let methOut = 0n
          let methIn = 0n
          let usdcOut = 0n
          if (usdcIsToken0) {
            usdcIn = amount0In ?? 0n
            methOut = amount1Out ?? 0n
            methIn = amount1In ?? 0n
            usdcOut = amount0Out ?? 0n
          } else {
            usdcIn = amount1In ?? 0n
            methOut = amount0Out ?? 0n
            methIn = amount0In ?? 0n
            usdcOut = amount1Out ?? 0n
          }
          let price = 0
          if (usdcIn > 0n && methOut > 0n) {
            price = Number(formatUnits(usdcIn, 18)) / Number(formatUnits(methOut, 18))
          } else if (methIn > 0n && usdcOut > 0n) {
            price = Number(formatUnits(usdcOut, 18)) / Number(formatUnits(methIn, 18))
          }
          if (price > 0 && Number.isFinite(price)) {
            points.push({ time: `#${log.blockNumber.toString()}`, price: Number(price.toFixed(2)) })
          }
        }
        return points
      } catch {
        return []
      }
    },
  })

  if (DEMO_MODE) {
    return { points: DEMO_PRICE_HISTORY, isLive: false, isLoading: false }
  }
  return { points: query.data ?? [], isLive: true, isLoading: query.isLoading }
}
