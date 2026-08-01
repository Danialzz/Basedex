import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import { motion } from 'framer-motion'
import { Sprout, Vault, TrendingUp, Wallet, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TokenInput } from '@/components/TokenInput'
import { StatCard } from '@/components/StatCard'
import { PriceChart } from '@/components/PriceChart'
import { useProtocolData } from '@/hooks/useProtocolData'
import { useTxAction } from '@/hooks/useTxAction'
import { ADDRESSES, TOKENS, mockErc20Abi, vaultAbi } from '@/config/contracts'
import { formatCompact, formatNumber, formatToken, safeParseUnits } from '@/lib/format'
import { projectedGrowth } from '@/lib/demo'

export function EarnSection() {
  const { isConnected, address } = useAccount()
  const data = useProtocolData()
  const { run } = useTxAction(data.refetch)
  const [busy, setBusy] = useState(false)
  const [depositAmt, setDepositAmt] = useState('')
  const [withdrawAmt, setWithdrawAmt] = useState('')

  const parsedDeposit = safeParseUnits(depositAmt, 18)
  const parsedWithdraw = safeParseUnits(withdrawAmt, 18)

  const sharePriceFloat = Number(formatUnits(data.sharePrice, 18))
  const userAssetsFloat =
    data.userVaultAssets !== undefined ? Number(formatUnits(data.userVaultAssets, 18)) : undefined
  const userSharesFloat =
    data.userVaultShares !== undefined ? Number(formatUnits(data.userVaultShares, 18)) : undefined

  const sharesPreview =
    parsedDeposit !== undefined && sharePriceFloat > 0
      ? Number(formatUnits(parsedDeposit, 18)) / sharePriceFloat
      : undefined

  const growthData = useMemo(
    () =>
      projectedGrowth(
        parsedDeposit !== undefined && parsedDeposit > 0n
          ? Number(formatUnits(parsedDeposit, 18))
          : 10_000,
        data.vaultApyBps,
      ),
    [parsedDeposit, data.vaultApyBps],
  )

  const wrap = (fn: () => Promise<boolean>) => async () => {
    setBusy(true)
    await fn()
    setBusy(false)
  }

  const needApproval =
    !data.isDemo &&
    isConnected &&
    parsedDeposit !== undefined &&
    parsedDeposit > 0n &&
    data.allowanceUsdcVault !== undefined &&
    data.allowanceUsdcVault < parsedDeposit

  const doApprove = () =>
    run(
      {
        address: TOKENS.mUSDC.address,
        abi: mockErc20Abi,
        functionName: 'approve',
        args: [ADDRESSES.vault, parsedDeposit],
      },
      { pending: 'Approving mUSDC…', success: 'mUSDC approved' },
    )

  const doDeposit = () => {
    if (!address || !parsedDeposit) return Promise.resolve(false)
    return run(
      {
        address: ADDRESSES.vault,
        abi: vaultAbi,
        functionName: 'deposit',
        args: [parsedDeposit, address],
      },
      { pending: 'Depositing into vault…', success: 'Deposit confirmed' },
    ).then((ok) => {
      if (ok) setDepositAmt('')
      return ok
    })
  }

  const doWithdraw = () => {
    if (!address || !parsedWithdraw) return Promise.resolve(false)
    return run(
      {
        address: ADDRESSES.vault,
        abi: vaultAbi,
        functionName: 'withdraw',
        args: [parsedWithdraw, address, address],
      },
      { pending: 'Withdrawing from vault…', success: 'Withdrawal confirmed' },
    ).then((ok) => {
      if (ok) setWithdrawAmt('')
      return ok
    })
  }

  const tvlFloat = Number(formatUnits(data.vaultTvl, 18))

  return (
    <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
      {/* -------------------------------------------- Deposit card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="glass rounded-3xl border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500">
                <Sprout className="h-5 w-5 text-white" />
              </span>
              <div>
                <CardTitle className="text-lg">mUSDC Vault</CardTitle>
                <CardDescription>ERC-4626 · auto-compounding</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="deposit">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-black/30">
                <TabsTrigger
                  value="deposit"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" /> Deposit
                </TabsTrigger>
                <TabsTrigger
                  value="withdraw"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  <ArrowUpFromLine className="mr-1.5 h-3.5 w-3.5" /> Withdraw
                </TabsTrigger>
              </TabsList>

              <TabsContent value="deposit" className="mt-4 space-y-3">
                <TokenInput
                  label="Deposit mUSDC"
                  token="mUSDC"
                  value={depositAmt}
                  onChange={setDepositAmt}
                  balance={
                    isConnected || data.isDemo ? formatToken(data.usdcBalance, 18, 2) : undefined
                  }
                  onMax={() => setDepositAmt(formatUnits(data.usdcBalance ?? 0n, 18))}
                />
                <div className="space-y-1.5 rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">You receive (est.)</span>
                    <span className="font-medium">
                      {sharesPreview !== undefined ? formatNumber(sharesPreview, 4) : '—'} bvUSD
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Share price</span>
                    <span className="font-medium">{formatNumber(sharePriceFloat, 4)} mUSDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current APY</span>
                    <span className="font-medium text-emerald-400">
                      {formatNumber(data.vaultApyBps / 100, 2)}%
                    </span>
                  </div>
                </div>
                {needApproval ? (
                  <Button
                    className="h-12 w-full rounded-2xl font-semibold"
                    disabled={busy}
                    onClick={wrap(doApprove)}
                  >
                    {busy ? 'Approving…' : 'Approve mUSDC'}
                  </Button>
                ) : (
                  <Button
                    className="h-12 w-full rounded-2xl font-semibold"
                    disabled={
                      busy ||
                      (!data.isDemo && (!isConnected || !parsedDeposit || parsedDeposit <= 0n))
                    }
                    onClick={wrap(doDeposit)}
                  >
                    {busy
                      ? 'Depositing…'
                      : data.isDemo
                        ? 'Deposit (demo)'
                        : isConnected
                          ? 'Deposit'
                          : 'Connect wallet'}
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="withdraw" className="mt-4 space-y-3">
                <TokenInput
                  label="Withdraw mUSDC"
                  token="mUSDC"
                  value={withdrawAmt}
                  onChange={setWithdrawAmt}
                  balance={
                    userAssetsFloat !== undefined ? formatNumber(userAssetsFloat, 2) : undefined
                  }
                  onMax={() =>
                    data.userVaultAssets !== undefined &&
                    setWithdrawAmt(formatUnits(data.userVaultAssets, 18))
                  }
                />
                <div className="space-y-1.5 rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your vault balance</span>
                    <span className="font-medium">
                      {userAssetsFloat !== undefined
                        ? `${formatNumber(userAssetsFloat, 2)} mUSDC`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shares burned</span>
                    <span className="font-medium">
                      {parsedWithdraw !== undefined && sharePriceFloat > 0
                        ? formatNumber(Number(formatUnits(parsedWithdraw, 18)) / sharePriceFloat, 4)
                        : '—'}{' '}
                      bvUSD
                    </span>
                  </div>
                </div>
                <Button
                  className="h-12 w-full rounded-2xl font-semibold"
                  variant="outline"
                  disabled={
                    busy ||
                    (!data.isDemo && (!isConnected || !parsedWithdraw || parsedWithdraw <= 0n))
                  }
                  onClick={wrap(doWithdraw)}
                >
                  {busy ? 'Withdrawing…' : data.isDemo ? 'Withdraw (demo)' : 'Withdraw'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* -------------------------------------- Stats + projection */}
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={Vault}
            label="Vault TVL"
            value={`$${formatCompact(tvlFloat)}`}
            sub="mUSDC under management"
            delay={0.05}
            accent="text-emerald-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Current APY"
            value={`${formatNumber(data.vaultApyBps / 100, 2)}%`}
            sub="Emission-funded, accrues every second"
            delay={0.1}
            accent="text-emerald-400"
          />
          <StatCard
            icon={Wallet}
            label="Your position"
            value={userAssetsFloat !== undefined ? `$${formatCompact(userAssetsFloat)}` : '—'}
            sub={
              userSharesFloat !== undefined
                ? `${formatNumber(userSharesFloat, 2)} bvUSD shares`
                : 'Connect wallet'
            }
            delay={0.15}
            accent="text-emerald-400"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="glass rounded-3xl border-white/10">
            <CardHeader className="flex-row items-baseline justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Projected growth</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {parsedDeposit !== undefined && parsedDeposit > 0n
                    ? `Your deposit of ${formatNumber(Number(formatUnits(parsedDeposit, 18)), 0)} mUSDC at ${formatNumber(data.vaultApyBps / 100, 1)}% APY`
                    : `10,000 mUSDC at ${formatNumber(data.vaultApyBps / 100, 1)}% APY — type a deposit amount to personalize`}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold tracking-tight text-emerald-400">
                  ${formatCompact(growthData[growthData.length - 1]?.value ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">after 12 months</div>
              </div>
            </CardHeader>
            <CardContent>
              <PriceChart data={growthData} color="#34d399" height={240} unit="$" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className="glass rounded-3xl border-white/10 p-5 text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">How the vault works.</span> The vault
            follows the ERC-4626 tokenized-vault standard: you deposit mUSDC and receive bvUSD
            shares; yield accrues continuously at a fixed emission rate, so each share becomes
            redeemable for more mUSDC over time. On this testnet deployment yield is simulated by
            minting (the vault holds the minter role) — the share accounting is identical to a real
            yield-bearing vault integrated with a lending market or LP strategy.
          </div>
        </motion.div>
      </div>
    </div>
  )
}
