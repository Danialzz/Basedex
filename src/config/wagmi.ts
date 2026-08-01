import { http, createConfig } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'

/**
 * Wagmi configuration.
 *
 * The dapp targets Base Sepolia (chain ID 84532). To point at your own RPC
 * (recommended for production demos), set VITE_RPC_URL in .env — see
 * .env.example.
 */
export const RPC_URL: string | undefined = import.meta.env.VITE_RPC_URL

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [injected(), coinbaseWallet({ appName: 'BaseDex', appChainIds: [baseSepolia.id] })],
  transports: {
    [baseSepolia.id]: http(RPC_URL),
  },
})

export { baseSepolia }
