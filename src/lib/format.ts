import { formatUnits } from 'viem'

/** Format a bigint token amount into a compact human string. */
export function formatToken(
  value: bigint | undefined,
  decimals = 18,
  maxFractionDigits = 4,
): string {
  if (value === undefined) return '—'
  const num = Number(formatUnits(value, decimals))
  return formatNumber(num, maxFractionDigits)
}

/** Format a JS number with thousands separators and sensible precision. */
export function formatNumber(num: number, maxFractionDigits = 4): string {
  if (!Number.isFinite(num)) return '—'
  if (num !== 0 && Math.abs(num) < 0.0001) return '<0.0001'
  const abs = Math.abs(num)
  const digits = abs >= 1000 ? Math.min(maxFractionDigits, 2) : maxFractionDigits
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

/** Compact USD-style formatting for large figures ($1.24M). */
export function formatCompact(num: number): string {
  if (!Number.isFinite(num)) return '—'
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(2)}K`
  return formatNumber(num, 2)
}

export function formatPercent(bpsOrRatio: number, isBps = false): string {
  const pct = isBps ? bpsOrRatio / 100 : bpsOrRatio * 100
  return `${formatNumber(pct, 2)}%`
}

export function shortenAddress(addr: string, chars = 4): string {
  return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`
}

/** HH:MM:SS countdown for faucet cooldowns. */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Ready'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return h > 0
    ? `${h}h ${m}m ${s}s`
    : m > 0
      ? `${m}m ${s}s`
      : `${s}s`
}

/** Parse a user input string into bigint units; returns undefined if invalid. */
export function safeParseUnits(input: string, decimals: number): bigint | undefined {
  try {
    if (!input || input === '.' || Number.isNaN(Number(input))) return undefined
    const [whole, frac = ''] = input.split('.')
    const padded = (frac + '0'.repeat(decimals)).slice(0, decimals)
    const normalized = `${whole === '' ? '0' : whole}.${padded}`
    // viem parseUnits without importing here to keep this util framework-agnostic
    const negative = normalized.startsWith('-')
    const [w, f = ''] = normalized.replace('-', '').split('.')
    const value = BigInt(w === '' ? '0' : w) * 10n ** BigInt(decimals) + BigInt(f === '' ? '0' : f)
    return negative ? -value : value
  } catch {
    return undefined
  }
}
