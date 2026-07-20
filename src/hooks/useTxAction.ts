import { useCallback, useEffect, useRef } from 'react'
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useAccount,
  useChainId,
} from 'wagmi'
import { toast } from 'sonner'
import type { Address } from 'viem'
import { CHAIN_ID, DEMO_MODE, EXPLORER } from '@/config/contracts'

interface TxConfig {
  address: Address
  abi: readonly unknown[]
  functionName: string
  args?: readonly unknown[]
}

interface TxMessages {
  pending: string
  success: string
}

/**
 * One-stop transaction runner:
 *  - guards demo mode (shows an explanatory toast instead of reverting)
 *  - auto-switches the wallet to Base Sepolia when on the wrong network
 *  - emits pending/success/error toasts with Basescan links
 */
export function useTxAction(onConfirmed?: () => void) {
  const chainId = useChainId()
  const { isConnected } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync, reset } = useWriteContract()
  const hashRef = useRef<`0x${string}` | undefined>(undefined)

  const receipt = useWaitForTransactionReceipt({ hash: hashRef.current })
  const onConfirmedRef = useRef(onConfirmed)
  onConfirmedRef.current = onConfirmed

  useEffect(() => {
    if (receipt.isSuccess && hashRef.current) {
      toast.success('Transaction confirmed', {
        action: {
          label: 'Basescan',
          onClick: () => window.open(`${EXPLORER}/tx/${hashRef.current}`, '_blank'),
        },
      })
      onConfirmedRef.current?.()
      hashRef.current = undefined
      reset()
    }
    if (receipt.isError) {
      toast.error('Transaction failed on-chain')
      hashRef.current = undefined
      reset()
    }
  }, [receipt.isSuccess, receipt.isError, reset])

  const run = useCallback(
    async (config: TxConfig, messages: TxMessages): Promise<boolean> => {
      if (DEMO_MODE) {
        toast.info('Demo mode', {
          description:
            'Contracts are not deployed yet. Run the deploy script, then this button sends a real transaction on Base Sepolia.',
        })
        return false
      }
      if (!isConnected) {
        toast.error('Connect your wallet first')
        return false
      }
      try {
        if (chainId !== CHAIN_ID) {
          toast.info('Switching to Base Sepolia…')
          await switchChainAsync({ chainId: CHAIN_ID })
        }
        const toastId = toast.loading(messages.pending)
        const hash = await writeContractAsync(config as never)
        hashRef.current = hash
        toast.loading('Waiting for confirmation…', {
          id: toastId,
          action: {
            label: 'Basescan',
            onClick: () => window.open(`${EXPLORER}/tx/${hash}`, '_blank'),
          },
        })
        return true
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const short = msg.includes('User rejected')
          ? 'Transaction rejected in wallet'
          : (err as { shortMessage?: string })?.shortMessage ?? 'Transaction failed'
        toast.error(short)
        return false
      }
    },
    [chainId, isConnected, switchChainAsync, writeContractAsync],
  )

  return { run, isPending: receipt.isLoading }
}
