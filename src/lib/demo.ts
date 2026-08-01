/**
 * Deterministic demo data used while the app runs in DEMO MODE (i.e. before
 * contract addresses are written to src/config/deployments.json). The numbers
 * mirror what the deploy script seeds: a 200,000 mUSDC / 100 mETH pool at an
 * implied price of 2,000 mUSDC per mETH, and a vault emitting ~10% APY.
 */

export interface PricePoint {
  time: string
  price: number
}

/** Seeded pseudo-random walk so the chart looks identical on every load. */
function seededWalk(
  seed: number,
  points: number,
  start: number,
  drift: number,
  vol: number,
): number[] {
  let s = seed
  const rand = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  const out: number[] = [start]
  for (let i = 1; i < points; i++) {
    const shock = (rand() - 0.5) * vol
    out.push(Math.max(out[i - 1] * (1 + drift + shock), 1))
  }
  return out
}

const HOUR_LABELS: string[] = (() => {
  const labels: string[] = []
  const now = new Date()
  for (let i = 47; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600_000)
    labels.push(`${String(d.getHours()).padStart(2, '0')}:00`)
  }
  return labels
})()

const priceSeries = seededWalk(42, 48, 1952, 0.0007, 0.011)

export const DEMO_PRICE_HISTORY: PricePoint[] = priceSeries.map((p, i) => ({
  time: HOUR_LABELS[i],
  price: Number(p.toFixed(2)),
}))

export const DEMO = {
  /** Pool reserves */
  reserveUsdc: 200_000,
  reserveMeth: 100,
  /** Spot price mUSDC per mETH */
  get price(): number {
    return priceSeries[priceSeries.length - 1]
  },
  lpTotalSupply: 141_421.35,
  userLpBalance: 1_214.9,
  userUsdc: 4_820.55,
  userMeth: 1.735,
  /** Vault */
  vaultTvl: 412_803.19,
  vaultApyBps: 770, // ~7.7% at this TVL with the default emission
  sharePrice: 1.0421,
  userVaultShares: 1_850.0,
  /** Faucet */
  faucetUsdc: 1_000,
  faucetMeth: 0.25,
}

/** 1-year projected growth of a deposit at a constant rate, monthly points. */
export function projectedGrowth(
  principal: number,
  apyBps: number,
): { month: string; value: number }[] {
  const apy = apyBps / 10_000
  const out: { month: string; value: number }[] = []
  for (let m = 0; m <= 12; m++) {
    out.push({
      month: m === 0 ? 'Now' : `M${m}`,
      value: Number((principal * Math.pow(1 + apy, m / 12)).toFixed(2)),
    })
  }
  return out
}
