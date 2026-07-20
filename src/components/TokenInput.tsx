import { TOKENS, type TokenSymbol } from '@/config/contracts'
import { formatNumber } from '@/lib/format'
import { TokenBadge } from './TokenBadge'
import { Button } from '@/components/ui/button'

/**
 * Amount input row with token identity, wallet balance and a MAX shortcut —
 * the core building block of the Swap / Pool / Earn cards.
 */
export function TokenInput({
  label,
  token,
  value,
  onChange,
  balance,
  usdValue,
  readOnly = false,
  onMax,
}: {
  label: string
  token: TokenSymbol
  value: string
  onChange?: (v: string) => void
  balance?: string
  usdValue?: number
  readOnly?: boolean
  onMax?: () => void
}) {
  const meta = TOKENS[token]
  return (
    <div className="rounded-2xl border border-white/5 bg-black/30 p-4 transition-colors focus-within:border-primary/50">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {balance !== undefined && (
          <span className="flex items-center gap-1.5">
            Balance: <span className="font-medium text-foreground/90">{balance}</span>
            {onMax && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-5 rounded-md px-1.5 text-[10px] font-bold text-primary hover:bg-primary/10 hover:text-primary"
                onClick={onMax}
              >
                MAX
              </Button>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          value={value}
          readOnly={readOnly}
          onChange={(e) => {
            const v = e.target.value
            if (v === '' || /^\d*\.?\d*$/.test(v)) onChange?.(v)
          }}
          placeholder="0.0"
          inputMode="decimal"
          className="w-full bg-transparent text-2xl font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40"
        />
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
          <TokenBadge symbol={token} size="sm" />
          <span className="text-sm font-semibold">{meta.symbol}</span>
        </div>
      </div>
      {usdValue !== undefined && value && Number(value) > 0 && (
        <div className="mt-1.5 text-xs text-muted-foreground">
          ≈ ${formatNumber(usdValue, 2)}
        </div>
      )}
    </div>
  )
}
