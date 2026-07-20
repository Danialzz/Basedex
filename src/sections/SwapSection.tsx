import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import { motion } from 'framer-motion'
import { ArrowDownUp, Settings, TrendingUp, Droplets, Percent } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TokenInput } from '@/components/TokenInput'
import { PriceChart } from '@/components/PriceChart'
import { StatCard } from '@/components/StatCard'
import { useProtocolData } from '@/hooks/useProtocolData'
import { usePriceHistory } from '@/hooks/usePriceHistory'
import { useTxAction } from '@/hooks/useTxAction'
import { ADDRESSES, TOKENS, mockErc20Abi, pairAbi, type TokenSymbol } from '@/config/contracts'
import { formatCompact, formatNumber, formatToken, safeParseUnits } from '@/lib/format'
import { cn } from '@/lib/utils'

const SLIPPAGE_OPTIONS = [0.1, 0.5, 1.0]

/** Local mirror of SimplePair.getAmountOut (avoids an RPC round-trip per keystroke). */
function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n
  const amountInWithFee = amountIn * 997n
  return (amountInWithFee * reserveOut) / (reserveIn * 1000n + amountInWithFee)
}

export function SwapSection() {
  const { isConnected, address } = useAccount()
  const data = useProtocolData()
  const { points, isLive } = usePriceHistory(data.usdcIsToken0)
  const { run } = useTxAction(data.refetch)

  const [tokenIn, setTokenIn] = useState<TokenSymbol>('mUSDC')
  const [amountIn, setAmountIn] = useState('')
  const [slippage, setSlippage] = useState(0.5)

  const tokenOut: TokenSymbol = tokenIn === 'mUSDC' ? 'mETH' : 'mUSDC'
  const reserveIn = tokenIn === 'mUSDC' ? data.reserveUsdc : data.reserveMeth
  const reserveOut = tokenIn === 'mUSDC' ? data.reserveMeth : data.reserveUsdc
  const balanceIn = tokenIn === 'mUSDC' ? data.usdcBalance : data.methBalance

  const parsedIn = safeParseUnits(amountIn, 18)
  const quotedOut = useMemo(
    () => (parsedIn ? getAmountOut(parsedIn, reserveIn, reserveOut) : 0n),
    [parsedIn, reserveIn, reserveOut],
  )

  const minReceived = (quotedOut * BigInt(Math.round((100 - slippage) * 100))) / 10_000n

  // Price impact: execution price vs mid price
  const priceImpact = useMemo(() => {
    if (!parsedIn || quotedOut === 0n || reserveIn === 0n) return 0
    const mid = Number(formatUnits(reserveOut, 18)) / Number(formatUnits(reserveIn, 18))
    const exec = Number(formatUnits(quotedOut, 18)) / Number(formatUnits(parsedIn, 18))
    return Math.max(0, (1 - exec / mid) * 100)
  }, [parsedIn, quotedOut, reserveIn, reserveOut])

  const insufficient = parsedIn !== undefined && balanceIn !== undefined && parsedIn > balanceIn
  const allowance = tokenIn === 'mUSDC' ? data.allowanceUsdcPair : data.allowanceMethPair
  const needsApproval =
    !data.isDemo && isConnected && parsedIn !== undefined && parsedIn > 0n && allowance !== undefined && allowance < parsedIn

  const flip = () => {
    setTokenIn(tokenOut)
    setAmountIn('')
  }

  const rate =
    parsedIn && quotedOut > 0n
      ? Number(formatUnits(quotedOut, 18)) / Number(formatUnits(parsedIn, 18))
      : reserveIn > 0n
        ? Number(formatUnits(reserveOut, 18)) / Number(formatUnits(reserveIn, 18))
        : 0

  const doApprove = () =>
    run(
      {
        address: TOKENS[tokenIn].address,
        abi: mockErc20Abi,
        functionName: 'approve',
        args: [ADDRESSES.pair, parsedIn],
      },
      { pending: `Approving ${TOKENS[tokenIn].symbol}…`, success: 'Approved' },
    )

  const doSwap = () => {
    if (!address || !parsedIn) return Promise.resolve(false)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20)
    return run(
      {
        address: ADDRESSES.pair,
        abi: pairAbi,
        functionName: 'swapExactIn',
        args: [TOKENS[tokenIn].address, parsedIn, minReceived, address, deadline],
      },
      { pending: 'Swapping…', success: 'Swap confirmed' },
    ).then((ok) => {
      if (ok) setAmountIn('')
      return ok
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
      {/* ------------------------------------------------ Swap card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="glass rounded-3xl border-white/10">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg">Swap</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="glass w-64 rounded-2xl border-white/10">
                <div className="text-sm font-semibold">Slippage tolerance</div>
                <div className="mt-2.5 flex gap-2">
                  {SLIPPAGE_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlippage(s)}
                      className={cn(
                        'flex-1 rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors',
                        slippage === s
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-white/10 text-muted-foreground hover:border-white/20',
                      )}
                    >
                      {s}%
                    </button>
                  ))}
                </div>
                <p className="mt-2.5 text-xs text-muted-foreground">
                  Your transaction reverts if the price moves more than this against you.
                </p>
              </PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent className="space-y-2">
            <TokenInput
              label="You pay"
              token={tokenIn}
              value={amountIn}
              onChange={setAmountIn}
              balance={isConnected || data.isDemo ? formatToken(balanceIn, 18, 4) : undefined}
              usdValue={tokenIn === 'mUSDC' ? Number(amountIn) || 0 : (Number(amountIn) || 0) * data.price}
              onMax={() => balanceIn !== undefined && setAmountIn(formatUnits(balanceIn, 18))}
            />

            <div className="relative flex justify-center py-1">
              <button
                onClick={flip}
                className="absolute -top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-card text-primary shadow-lg transition-transform hover:scale-110 hover:rotate-180"
                aria-label="Flip tokens"
              >
                <ArrowDownUp className="h-4 w-4" />
              </button>
            </div>

            <TokenInput
              label="You receive"
              token={tokenOut}
              value={quotedOut > 0n ? formatUnits(quotedOut, 18) : ''}
              readOnly
              usdValue={
                tokenOut === 'mUSDC'
                  ? Number(formatUnits(quotedOut, 18))
                  : Number(formatUnits(quotedOut, 18)) * data.price
              }
            />

            {/* Quote details */}
            <div className="space-y-1.5 rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate</span>
                <span className="font-medium">
                  1 {TOKENS[tokenIn].symbol} ≈ {formatNumber(rate, 6)} {TOKENS[tokenOut].symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price impact</span>
                <span className={cn('font-medium', priceImpact > 5 ? 'text-destructive' : priceImpact > 1 ? 'text-amber-400' : 'text-emerald-400')}>
                  {priceImpact < 0.01 ? '<0.01' : formatNumber(priceImpact, 2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum received ({slippage}% slippage)</span>
                <span className="font-medium">{formatToken(minReceived, 18, 6)} {TOKENS[tokenOut].symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">LP fee</span>
                <span className="font-medium">0.30%</span>
              </div>
            </div>

            <SwapButton
              isDemo={data.isDemo}
              isConnected={isConnected}
              parsedIn={parsedIn}
              insufficient={insufficient}
              needsApproval={needsApproval}
              tokenIn={tokenIn}
              onApprove={doApprove}
              onSwap={doSwap}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* ------------------------------------------- Chart + pair stats */}
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={TrendingUp} label="mETH Price" value={`${formatNumber(data.price, 2)} mUSDC`} sub="Spot · mUSDC per mETH" delay={0.05} />
          <StatCard icon={Droplets} label="Pool TVL" value={`$${formatCompact(Number(formatUnits(data.reserveUsdc, 18)) * 2)}`} sub={`${formatCompact(Number(formatUnits(data.reserveUsdc, 18)))} mUSDC + ${formatNumber(Number(formatUnits(data.reserveMeth, 18)), 2)} mETH`} delay={0.1} />
          <StatCard icon={Percent} label="LP Fee" value="0.30%" sub="Accrues to liquidity providers" delay={0.15} />
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="glass rounded-3xl border-white/10">
            <CardHeader className="flex-row items-baseline justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">mETH / mUSDC</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isLive ? 'Execution prices of recent on-chain swaps (by block)' : 'Simulated 48h price action — demo mode'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold tracking-tight">{formatNumber(data.price, 2)}</div>
                <div className="text-xs text-muted-foreground">mUSDC per mETH</div>
              </div>
            </CardHeader>
            <CardContent>
              {points.length > 0 ? (
                <PriceChart data={points} color="#0052FF" height={260} />
              ) : (
                <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-muted-foreground">
                  {isLive ? 'No swaps yet — be the first to trade!' : 'Loading chart…'}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

function SwapButton({
  isDemo,
  isConnected,
  parsedIn,
  insufficient,
  needsApproval,
  tokenIn,
  onApprove,
  onSwap,
}: {
  isDemo: boolean
  isConnected: boolean
  parsedIn: bigint | undefined
  insufficient: boolean
  needsApproval: boolean
  tokenIn: TokenSymbol
  onApprove: () => Promise<boolean>
  onSwap: () => Promise<boolean>
}) {
  const [busy, setBusy] = useState(false)
  const wrap = (fn: () => Promise<boolean>) => async () => {
    setBusy(true)
    await fn()
    setBusy(false)
  }

  const base = 'h-12 w-full rounded-2xl text-base font-semibold transition-all'

  if (isDemo) {
    return (
      <Button className={base} onClick={wrap(onSwap)} disabled={busy}>
        {busy ? 'Confirming…' : 'Swap (demo)'}
      </Button>
    )
  }
  if (!isConnected) {
    return <Button className={base} disabled>Connect wallet to swap</Button>
  }
  if (!parsedIn || parsedIn <= 0n) {
    return <Button className={base} disabled>Enter an amount</Button>
  }
  if (insufficient) {
    return <Button className={base} variant="destructive" disabled>Insufficient {TOKENS[tokenIn].symbol} balance</Button>
  }
  if (needsApproval) {
    return (
      <Button className={base} onClick={wrap(onApprove)} disabled={busy}>
        {busy ? 'Approving…' : `Approve ${TOKENS[tokenIn].symbol}`}
      </Button>
    )
  }
  return (
    <Button className={base} onClick={wrap(onSwap)} disabled={busy}>
      {busy ? 'Swapping…' : 'Swap'}
    </Button>
  )
}
