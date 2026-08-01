import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { motion } from 'framer-motion'
import { Droplet, ExternalLink, Fuel, ListChecks, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TokenBadge } from '@/components/TokenBadge'
import { useProtocolData } from '@/hooks/useProtocolData'
import { useTxAction } from '@/hooks/useTxAction'
import { ADDRESSES, mockErc20Abi, type TokenSymbol } from '@/config/contracts'
import { formatCountdown, formatToken } from '@/lib/format'

/** Local per-second countdown seeded from the on-chain value. */
function useCountdown(initial: number) {
  const [left, setLeft] = useState(initial)
  // Re-seed when the on-chain value changes by resetting state during render
  // (the supported "derive state from props" pattern) instead of in an effect.
  const [prevInitial, setPrevInitial] = useState(initial)
  if (initial !== prevInitial) {
    setPrevInitial(initial)
    setLeft(initial)
  }
  useEffect(() => {
    if (left <= 0) return
    const t = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000)
    return () => clearInterval(t)
  }, [left > 0]) // eslint-disable-line react-hooks/exhaustive-deps
  return left
}

export function FaucetSection() {
  const { isConnected } = useAccount()
  const data = useProtocolData()
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold tracking-tight">Testnet faucet</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Claim free demo tokens to try swapping, pooling and the vault. Each token is claimable
          once per 24h per wallet.
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FaucetCard
          token="mUSDC"
          amount={formatToken(data.faucetUsdcAmount, 18, 0)}
          cooldown={data.faucetUsdcCooldown}
          isConnected={isConnected}
          isDemo={data.isDemo}
        />
        <FaucetCard
          token="mETH"
          amount={formatToken(data.faucetMethAmount, 18, 2)}
          cooldown={data.faucetMethCooldown}
          isConnected={isConnected}
          isDemo={data.isDemo}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass rounded-3xl border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-primary" /> Getting started in 3 steps
            </CardTitle>
            <CardDescription>
              Everything runs on Base Sepolia — no real funds needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Step
              n={1}
              title="Get Base Sepolia ETH"
              desc="For gas. Free from the official Coinbase faucet or any Base Sepolia faucet."
              link={{
                href: 'https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet',
                label: 'Open ETH faucet',
              }}
            />
            <Step
              n={2}
              title="Claim mUSDC & mETH above"
              desc="These mock tokens back the demo pool and vault."
            />
            <Step
              n={3}
              title="Swap, add liquidity, or deposit in the vault"
              desc="All transactions are real on-chain calls on Base Sepolia — track them on Basescan."
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

function FaucetCard({
  token,
  amount,
  cooldown,
  isConnected,
  isDemo,
}: {
  token: TokenSymbol
  amount: string
  cooldown: number
  isConnected: boolean
  isDemo: boolean
}) {
  const data = useProtocolData()
  const { run } = useTxAction(data.refetch)
  const [busy, setBusy] = useState(false)
  const left = useCountdown(cooldown)
  const claimable = left === 0

  const doClaim = async () => {
    setBusy(true)
    await run(
      { address: ADDRESSES[token], abi: mockErc20Abi, functionName: 'faucet' },
      { pending: `Claiming ${token}…`, success: `${token} claimed` },
    )
    setBusy(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Card className="glass rounded-3xl border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <TokenBadge symbol={token} size="lg" />
            <div>
              <div className="font-semibold">{token}</div>
              <div className="text-xs text-muted-foreground">{amount} per claim · 24h cooldown</div>
            </div>
            <Droplet className="ml-auto h-5 w-5 text-primary/60" />
          </div>
          <Button
            className="mt-5 h-11 w-full rounded-2xl font-semibold"
            disabled={busy || (!isDemo && (!isConnected || !claimable))}
            onClick={doClaim}
            variant={claimable ? 'default' : 'outline'}
          >
            {busy ? (
              'Claiming…'
            ) : isDemo ? (
              `Claim ${amount} ${token} (demo)`
            ) : !isConnected ? (
              'Connect wallet'
            ) : claimable ? (
              `Claim ${amount} ${token}`
            ) : (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {formatCountdown(left)}
              </span>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function Step({
  n,
  title,
  desc,
  link,
}: {
  n: number
  title: string
  desc: string
  link?: { href: string; label: string }
}) {
  return (
    <div className="flex gap-3.5 rounded-2xl border border-white/5 bg-black/20 p-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
        {n}
      </span>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</div>
        {link && (
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {link.label} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {n === 1 && <Fuel className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/50" />}
    </div>
  )
}
