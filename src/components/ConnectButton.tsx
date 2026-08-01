import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { Copy, ExternalLink, LogOut, Wallet, AlertTriangle, ChevronDown, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { shortenAddress } from '@/lib/format'
import { CHAIN_ID, EXPLORER } from '@/config/contracts'

/** Deterministic gradient avatar derived from the wallet address. */
export function AddressAvatar({ address, size = 32 }: { address: string; size?: number }) {
  const hue = parseInt(address.slice(2, 6), 16) % 360
  const hue2 = (hue + 80) % 360
  return (
    <span
      className="inline-block shrink-0 rounded-full ring-2 ring-white/10"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue} 85% 60%), hsl(${hue2} 85% 45%))`,
      }}
    />
  )
}

const WALLET_META: Record<string, { label: string; icon: string }> = {
  injected: { label: 'Browser Wallet', icon: '🦊' },
  coinbaseWalletSDK: { label: 'Coinbase Wallet', icon: '🔵' },
}

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { connectors, connectAsync, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChainAsync } = useSwitchChain()
  const [open, setOpen] = useState(false)

  // Connected but on the wrong network → prominent switcher
  if (isConnected && chainId !== CHAIN_ID) {
    return (
      <Button
        onClick={() => switchChainAsync({ chainId: baseSepolia.id })}
        variant="destructive"
        className="gap-2 rounded-xl font-semibold"
      >
        <AlertTriangle className="h-4 w-4" />
        Switch to Base Sepolia
      </Button>
    )
  }

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="glass gap-2.5 rounded-xl border-white/10 px-3 hover:border-primary/40"
          >
            <AddressAvatar address={address} size={22} />
            <span className="font-mono text-sm">{shortenAddress(address)}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass w-60 rounded-xl border-white/10">
          <DropdownMenuLabel className="flex items-center gap-2.5 py-3">
            <AddressAvatar address={address} size={34} />
            <div>
              <div className="font-mono text-sm">{shortenAddress(address, 6)}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Base Sepolia
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/5" />
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => {
              navigator.clipboard.writeText(address)
              toast.success('Address copied', { icon: <Check className="h-4 w-4" /> })
            }}
          >
            <Copy className="h-4 w-4" /> Copy address
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => window.open(`${EXPLORER}/address/${address}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4" /> View on Basescan
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/5" />
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            onClick={() => disconnect()}
          >
            <LogOut className="h-4 w-4" /> Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="gap-2 rounded-xl bg-primary font-semibold shadow-[0_0_24px_-6px_hsl(221_100%_50%/0.6)] hover:bg-primary/90"
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass rounded-2xl border-white/10 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl">Connect a wallet</DialogTitle>
            <DialogDescription>
              Connect to start swapping, pooling and earning on Base Sepolia.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-2.5">
            {connectors.map((connector) => {
              const meta = WALLET_META[connector.id] ?? { label: connector.name, icon: '👛' }
              return (
                <button
                  key={connector.uid}
                  disabled={isPending}
                  onClick={async () => {
                    try {
                      await connectAsync({ connector, chainId: CHAIN_ID })
                      setOpen(false)
                      toast.success(`Connected with ${meta.label}`)
                    } catch {
                      toast.error('Connection cancelled')
                    }
                  }}
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                >
                  <span className="text-2xl">{meta.icon}</span>
                  <div>
                    <div className="font-semibold">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {connector.id === 'injected'
                        ? 'MetaMask, Rabby, Phantom…'
                        : 'Smart wallet — no extension needed'}
                    </div>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4 -rotate-90 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              )
            })}
          </div>
          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            New to Base? Get free test ETH from the{' '}
            <a
              href="https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              official faucet
            </a>
            .
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
