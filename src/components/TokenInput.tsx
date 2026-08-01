import { motion } from 'framer-motion'
import { TOKENS, type TokenSymbol } from '@/config/contracts'
import { formatNumber } from '@/lib/format'
import { TokenBadge } from './TokenBadge'
import { Button } from '@/components/ui/button'

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
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      className="
        group
        relative
        overflow-hidden
        rounded-3xl
        border
        border-white/10
        bg-gradient-to-br
        from-white/[0.05]
        to-white/[0.02]
        p-5
        backdrop-blur-xl
        transition-all
        duration-300
        hover:border-primary/30
        hover:shadow-[0_0_35px_rgba(0,82,255,.12)]
        focus-within:border-primary
        focus-within:shadow-[0_0_40px_rgba(0,82,255,.25)]
      "
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-primary/5 via-transparent to-cyan-400/5" />

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>

          {balance !== undefined && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Balance</span>

              <span className="font-semibold text-foreground">{balance}</span>

              {onMax && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onMax}
                  className="
                    h-6
                    rounded-lg
                    bg-primary/10
                    px-2.5
                    text-[10px]
                    font-bold
                    text-primary
                    transition-all
                    hover:bg-primary
                    hover:text-white
                  "
                >
                  MAX
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <input
            value={value}
            readOnly={readOnly}
            placeholder="0.00"
            inputMode="decimal"
            onChange={(e) => {
              const v = e.target.value

              if (v === '' || /^\d*\.?\d*$/.test(v)) onChange?.(v)
            }}
            className="
              w-full
              bg-transparent
              text-4xl
              font-semibold
              tracking-tight
              text-foreground
              outline-none
              placeholder:text-muted-foreground/30
            "
          />

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="
              flex
              items-center
              gap-3
              rounded-2xl
              border
              border-white/10
              bg-white/5
              px-4
              py-2.5
              shadow-inner
            "
          >
            <TokenBadge symbol={token} size="sm" />

            <div>
              <div className="text-sm font-bold">{meta.symbol}</div>

              <div className="text-[11px] text-muted-foreground">Token</div>
            </div>
          </motion.div>
        </div>

        {usdValue !== undefined && value && Number(value) > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-sm text-muted-foreground"
          >
            ≈ <span className="font-medium text-foreground">${formatNumber(usdValue, 2)}</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
