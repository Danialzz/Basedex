import { Waves } from 'lucide-react'
import { ConnectButton } from '@/components/ConnectButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { DEMO_MODE } from '@/config/contracts'
import { cn } from '@/lib/utils'

export type Tab = 'swap' | 'pool' | 'earn' | 'faucet'

const TABS: { id: Tab; label: string }[] = [
  { id: 'swap', label: 'Swap' },
  { id: 'pool', label: 'Pool' },
  { id: 'earn', label: 'Earn' },
  { id: 'faucet', label: 'Faucet' },
]

export function Header({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-soft bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-cyan-400 shadow-[0_0_20px_-4px_hsl(221_100%_50%/0.7)]">
            <Waves className="h-5 w-5 text-white" />
          </span>
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight">BaseDex</div>
            <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              DeFi Hub
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="surface ml-2 hidden items-center gap-1 rounded-full border border-soft p-1 sm:flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                tab === t.id
                  ? 'bg-primary text-white shadow-[0_0_16px_-4px_hsl(221_100%_50%/0.8)]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          {DEMO_MODE && (
            <span className="hidden items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300 md:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
              Demo mode
            </span>
          )}
          <span className="surface hidden items-center gap-1.5 rounded-full border border-softer px-3 py-1 text-xs font-medium text-muted-foreground lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0052FF]" />
            Base Sepolia
          </span>
          <ThemeToggle />
          <ConnectButton />
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-soft px-4 py-2 sm:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
              tab === t.id ? 'bg-primary text-white' : 'text-muted-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
