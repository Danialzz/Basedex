import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import { motion } from 'framer-motion'
import { Droplets, Plus, Minus, PieChart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { TokenInput } from '@/components/TokenInput'
import { StatCard } from '@/components/StatCard'
import { PairBadge } from '@/components/TokenBadge'
import { useProtocolData } from '@/hooks/useProtocolData'
import { useTxAction } from '@/hooks/useTxAction'
import { ADDRESSES, TOKENS, mockErc20Abi, pairAbi } from '@/config/contracts'
import { formatCompact, formatNumber, formatToken, safeParseUnits } from '@/lib/format'

/** 20-minute tx validity window. Called only from event handlers, never during render. */
const deadline = () => BigInt(Math.floor(Date.now() / 1000) + 60 * 20)

export function PoolSection() {
  const { isConnected, address } = useAccount()
  const data = useProtocolData()
  const { run } = useTxAction(data.refetch)
  const [busy, setBusy] = useState(false)

  const [usdcAmt, setUsdcAmt] = useState('')
  const [methAmt, setMethAmt] = useState('')
  const [removePct, setRemovePct] = useState(50)

  const price = data.price
  const parsedUsdc = safeParseUnits(usdcAmt, 18)
  const parsedMeth = safeParseUnits(methAmt, 18)

  const wrap = (fn: () => Promise<boolean>) => async () => {
    setBusy(true)
    await fn()
    setBusy(false)
  }

  /** Keep the two add-liquidity inputs at pool ratio. */
  const onUsdcChange = (v: string) => {
    setUsdcAmt(v)
    if (v && price > 0) setMethAmt((Number(v) / price).toFixed(6))
    else setMethAmt('')
  }
  const onMethChange = (v: string) => {
    setMethAmt(v)
    if (v && price > 0) setUsdcAmt((Number(v) * price).toFixed(2))
    else setUsdcAmt('')
  }

  // Share of pool after deposit (approximation: value-weighted)
  const shareAfter = useMemo(() => {
    if (!parsedUsdc || data.reserveUsdc === 0n) return undefined
    const pct =
      (Number(formatUnits(parsedUsdc, 18)) /
        (Number(formatUnits(data.reserveUsdc, 18)) + Number(formatUnits(parsedUsdc, 18)))) *
      100
    return pct
  }, [parsedUsdc, data.reserveUsdc])

  // LP position
  const lpBalance = data.lpBalance ?? 0n
  const lpShare = data.lpTotalSupply > 0n ? Number(lpBalance) / Number(data.lpTotalSupply) : 0
  const pooledUsdc = Number(formatUnits(data.reserveUsdc, 18)) * lpShare
  const pooledMeth = Number(formatUnits(data.reserveMeth, 18)) * lpShare
  const removeLiquidity = (lpBalance * BigInt(removePct)) / 100n

  // Approvals needed for add-liquidity
  const needUsdcApproval =
    !data.isDemo &&
    isConnected &&
    parsedUsdc !== undefined &&
    parsedUsdc > 0n &&
    data.allowanceUsdcPair !== undefined &&
    data.allowanceUsdcPair < parsedUsdc
  const needMethApproval =
    !data.isDemo &&
    isConnected &&
    parsedMeth !== undefined &&
    parsedMeth > 0n &&
    data.allowanceMethPair !== undefined &&
    data.allowanceMethPair < parsedMeth
  const needLpApproval =
    !data.isDemo &&
    isConnected &&
    removeLiquidity > 0n &&
    data.allowanceLpPair !== undefined &&
    data.allowanceLpPair < removeLiquidity

  const doApprove = (token: 'mUSDC' | 'mETH' | 'LP') => {
    const cfg =
      token === 'LP'
        ? {
            address: ADDRESSES.pair,
            abi: pairAbi,
            args: [ADDRESSES.pair, removeLiquidity] as const,
          }
        : {
            address: TOKENS[token].address,
            abi: mockErc20Abi,
            args: [ADDRESSES.pair, token === 'mUSDC' ? parsedUsdc : parsedMeth] as const,
          }
    return run(
      { address: cfg.address, abi: cfg.abi, functionName: 'approve', args: cfg.args },
      { pending: `Approving ${token}…`, success: `${token} approved` },
    )
  }

  const doAdd = () => {
    if (!address || !parsedUsdc || !parsedMeth) return Promise.resolve(false)
    const [d0, d1] = data.usdcIsToken0 ? [parsedUsdc, parsedMeth] : [parsedMeth, parsedUsdc]
    return run(
      {
        address: ADDRESSES.pair,
        abi: pairAbi,
        functionName: 'addLiquidity',
        args: [d0, d1, 0n, 0n, address, deadline()],
      },
      { pending: 'Adding liquidity…', success: 'Liquidity added' },
    ).then((ok) => {
      if (ok) {
        setUsdcAmt('')
        setMethAmt('')
      }
      return ok
    })
  }

  const doRemove = () => {
    if (!address || removeLiquidity === 0n) return Promise.resolve(false)
    return run(
      {
        address: ADDRESSES.pair,
        abi: pairAbi,
        functionName: 'removeLiquidity',
        args: [removeLiquidity, 0n, 0n, address, deadline()],
      },
      { pending: 'Removing liquidity…', success: 'Liquidity removed' },
    )
  }

  const addReady =
    parsedUsdc !== undefined && parsedUsdc > 0n && parsedMeth !== undefined && parsedMeth > 0n

  return (
    <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
      {/* ----------------------------------------- Add / Remove card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="glass rounded-3xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Liquidity</CardTitle>
            <CardDescription>Deposit both tokens to earn 0.30% of every swap.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="add">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-black/30">
                <TabsTrigger
                  value="add"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
                </TabsTrigger>
                <TabsTrigger
                  value="remove"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  <Minus className="mr-1.5 h-3.5 w-3.5" /> Remove
                </TabsTrigger>
              </TabsList>

              <TabsContent value="add" className="mt-4 space-y-2">
                <TokenInput
                  label="mUSDC"
                  token="mUSDC"
                  value={usdcAmt}
                  onChange={onUsdcChange}
                  balance={
                    isConnected || data.isDemo ? formatToken(data.usdcBalance, 18, 2) : undefined
                  }
                  onMax={() => onUsdcChange(formatUnits(data.usdcBalance ?? 0n, 18))}
                />
                <div className="flex justify-center text-muted-foreground">
                  <Plus className="h-4 w-4" />
                </div>
                <TokenInput
                  label="mETH"
                  token="mETH"
                  value={methAmt}
                  onChange={onMethChange}
                  balance={
                    isConnected || data.isDemo ? formatToken(data.methBalance, 18, 4) : undefined
                  }
                  onMax={() => onMethChange(formatUnits(data.methBalance ?? 0n, 18))}
                />
                <div className="space-y-1.5 rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pool ratio</span>
                    <span className="font-medium">1 mETH = {formatNumber(price, 2)} mUSDC</span>
                  </div>
                  {shareAfter !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Your share of pool after</span>
                      <span className="font-medium text-primary">
                        {formatNumber(shareAfter, 3)}%
                      </span>
                    </div>
                  )}
                </div>

                {needUsdcApproval ? (
                  <Button
                    className="h-12 w-full rounded-2xl font-semibold"
                    disabled={busy}
                    onClick={wrap(() => doApprove('mUSDC'))}
                  >
                    {busy ? 'Approving…' : 'Approve mUSDC'}
                  </Button>
                ) : needMethApproval ? (
                  <Button
                    className="h-12 w-full rounded-2xl font-semibold"
                    disabled={busy}
                    onClick={wrap(() => doApprove('mETH'))}
                  >
                    {busy ? 'Approving…' : 'Approve mETH'}
                  </Button>
                ) : (
                  <Button
                    className="h-12 w-full rounded-2xl font-semibold"
                    disabled={busy || (!data.isDemo && (!isConnected || !addReady))}
                    onClick={wrap(doAdd)}
                  >
                    {busy
                      ? 'Adding…'
                      : data.isDemo
                        ? 'Add liquidity (demo)'
                        : isConnected
                          ? 'Add liquidity'
                          : 'Connect wallet'}
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="remove" className="mt-4 space-y-4">
                <div className="rounded-2xl border border-white/5 bg-black/30 p-5 text-center">
                  <div className="text-4xl font-semibold tracking-tight text-primary">
                    {removePct}%
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatToken(removeLiquidity, 18, 4)} LP tokens
                  </div>
                  <Slider
                    value={[removePct]}
                    onValueChange={([v]) => setRemovePct(v)}
                    max={100}
                    step={1}
                    className="mt-5"
                  />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    {[25, 50, 75, 100].map((p) => (
                      <button
                        key={p}
                        onClick={() => setRemovePct(p)}
                        className="rounded-md px-2 py-1 hover:bg-white/5"
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5 rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">You receive</span>
                    <span className="font-medium">
                      {formatNumber(pooledUsdc * (removePct / 100), 2)} mUSDC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground" />
                    <span className="font-medium">
                      {formatNumber(pooledMeth * (removePct / 100), 5)} mETH
                    </span>
                  </div>
                </div>
                {needLpApproval ? (
                  <Button
                    className="h-12 w-full rounded-2xl font-semibold"
                    disabled={busy}
                    onClick={wrap(() => doApprove('LP'))}
                  >
                    {busy ? 'Approving…' : 'Approve LP tokens'}
                  </Button>
                ) : (
                  <Button
                    className="h-12 w-full rounded-2xl font-semibold"
                    variant="outline"
                    disabled={busy || (!data.isDemo && (!isConnected || lpBalance === 0n))}
                    onClick={wrap(doRemove)}
                  >
                    {busy
                      ? 'Removing…'
                      : data.isDemo
                        ? 'Remove liquidity (demo)'
                        : lpBalance === 0n
                          ? 'No LP position'
                          : 'Remove liquidity'}
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* ------------------------------------- Pool stats + position */}
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={Droplets}
            label="Pool TVL"
            value={`$${formatCompact(Number(formatUnits(data.reserveUsdc, 18)) * 2)}`}
            sub="mUSDC side valued ×2"
            delay={0.05}
          />
          <StatCard
            icon={PieChart}
            label="Your pool share"
            value={`${formatNumber(lpShare * 100, 3)}%`}
            sub={`${formatToken(lpBalance, 18, 2)} LP tokens`}
            delay={0.1}
          />
          <StatCard
            icon={Plus}
            label="Position value"
            value={`$${formatCompact(pooledUsdc * 2)}`}
            sub={
              lpBalance > 0n
                ? `${formatNumber(pooledUsdc, 2)} mUSDC + ${formatNumber(pooledMeth, 4)} mETH`
                : 'No position yet'
            }
            delay={0.15}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="glass rounded-3xl border-white/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <PairBadge />
                <div>
                  <CardTitle className="text-lg">mETH / mUSDC pool</CardTitle>
                  <CardDescription>
                    Constant-product AMM · fee 0.30% · LP token BS-LP
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Composition bars */}
              <PoolBar
                label="mUSDC"
                amount={Number(formatUnits(data.reserveUsdc, 18))}
                total={Number(formatUnits(data.reserveUsdc, 18)) * 2}
                color="#2775ca"
              />
              <PoolBar
                label="mETH"
                amount={Number(formatUnits(data.reserveMeth, 18)) * price}
                total={Number(formatUnits(data.reserveUsdc, 18)) * 2}
                color="#8a9cff"
                note={`${formatNumber(Number(formatUnits(data.reserveMeth, 18)), 3)} mETH`}
              />
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">How it works.</span> LPs deposit
                both sides of the pair and receive BS-LP tokens representing their share. Every swap
                pays a 0.30% fee into the pool, so LP tokens become redeemable for a growing amount
                of underlying over time. Removing liquidity burns BS-LP and returns your
                proportional share of both tokens.
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

function PoolBar({
  label,
  amount,
  total,
  color,
  note,
}: {
  label: string
  amount: number
  total: number
  color: string
  note?: string
}) {
  const pct = total > 0 ? Math.min((amount / total) * 100, 100) : 0
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-medium">
          {note ?? `$${formatCompact(amount)}`} · {formatNumber(pct, 1)}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}88, ${color})` }}
        />
      </div>
    </div>
  )
}
