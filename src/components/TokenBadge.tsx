import { TOKENS, type TokenSymbol } from '@/config/contracts'
import { cn } from '@/lib/utils'

/** Circular token icon with brand gradient + symbol letters. */
export function TokenBadge({
  symbol,
  size = 'md',
  className,
}: {
  symbol: TokenSymbol
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const token = TOKENS[symbol]
  const sizeCls =
    size === 'sm' ? 'h-6 w-6 text-[10px]' : size === 'lg' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-lg ring-1 ring-white/20',
        token.gradient,
        sizeCls,
        className,
      )}
    >
      {token.symbol === 'mUSDC' ? '$' : 'Ξ'}
    </span>
  )
}

/** Two overlapping token badges for the LP pair. */
export function PairBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <TokenBadge symbol="mETH" size="md" />
      <TokenBadge symbol="mUSDC" size="md" className="-ml-2.5" />
    </span>
  )
}
