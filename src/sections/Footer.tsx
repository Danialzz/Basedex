import { Waves, Github, FileText, ExternalLink } from 'lucide-react'
import { ADDRESSES, DEMO_MODE, EXPLORER } from '@/config/contracts'

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/5 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-cyan-400">
            <Waves className="h-3.5 w-3.5 text-white" />
          </span>
          BaseDex — a reference DeFi dapp on Base Sepolia
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <Github className="h-3.5 w-3.5" /> Source
          </a>
          {!DEMO_MODE && (
            <>
              <a href={`${EXPLORER}/address/${ADDRESSES.pair}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
                Pair <ExternalLink className="h-3 w-3" />
              </a>
              <a href={`${EXPLORER}/address/${ADDRESSES.vault}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
                Vault <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
          <a href="https://docs.base.org" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <FileText className="h-3.5 w-3.5" /> Base docs
          </a>
        </div>
      </div>
      <p className="mx-auto mt-5 max-w-6xl px-4 text-center text-[11px] leading-relaxed text-muted-foreground/60 sm:text-left">
        Testnet software for education and demonstration. Tokens are worthless mocks. Not audited — do not use with real funds.
      </p>
    </footer>
  )
}
