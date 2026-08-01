import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Header, type Tab } from '@/sections/Header'
import { SwapSection } from '@/sections/SwapSection'
import { PoolSection } from '@/sections/PoolSection'
import { EarnSection } from '@/sections/EarnSection'
import { FaucetSection } from '@/sections/FaucetSection'
import { Footer } from '@/sections/Footer'
import { Toaster } from '@/components/ui/sonner'

export default function Home() {
  const [tab, setTab] = useState<Tab>('swap')

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      {/* Ambient background: grid + color glows */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[480px] rounded-full bg-cyan-500/10 blur-[140px]" />
      </div>

      <Header tab={tab} onTab={setTab} />

      {/* Page intro */}
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Live on Base Sepolia · Chain ID 84532
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Trade, pool & earn{' '}
            <span className="bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent">
              on Base
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            A full-stack DeFi reference dapp: a constant-product AMM with LP fees and an ERC-4626
            yield vault — smart contracts verified on Basescan, UI wired straight to the chain.
          </p>
        </motion.div>
      </div>

      {/* Active tab */}
      <main className="mx-auto max-w-6xl px-4 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {tab === 'swap' && <SwapSection />}
            {tab === 'pool' && <PoolSection />}
            {tab === 'earn' && <EarnSection />}
            {tab === 'faucet' && <FaucetSection />}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <Toaster richColors closeButton position="top-right" />
    </div>
  )
}
