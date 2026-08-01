import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useAccount,
  useChainId,
} from 'wagmi'
import { toast } from 'sonner'
import type { Abi, Address } from 'viem'
import { CHAIN_ID, DEMO_MODE, EXPLORER } from '@/config/contracts'

interface TxConfig {
  address: Address
  abi: Abi
  functionName: string
  args?: readonly unknown[]
}

/** The exact parameter type writeContractAsync accepts (ABI-agnostic). */
type WriteVariables = Parameters<ReturnType<typeof useWriteContract>['writeContractAsync']>[0]

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
  // The tx hash drives useWaitForTransactionReceipt, so it must be state (not a
  // ref) for the receipt hook to re-run when a new hash arrives.
  const [hash, setHash] = useState<`0x${string}` | undefined>(undefined)

  const receipt = useWaitForTransactionReceipt({ hash })

  // Keep the latest callback in a ref so the confirmation effect below doesn't
  // need it as a dependency (avoids re-firing when the parent re-renders).
  const onConfirmedRef = useRef(onConfirmed)
  useEffect(() => {
    onConfirmedRef.current = onConfirmed
  }, [onConfirmed])

  // Fire the success/error toast exactly once per hash. A ref records which hash
  // was already handled so the effect doesn't loop; the hash itself is cleared
  // in `run` (an event handler) when the next transaction starts.
  const handledHashRef = useRef<`0x${string}` | undefined>(undefined)

  useEffect(() => {
    if (!hash || handledHashRef.current === hash) return
    if (receipt.isSuccess) {
      handledHashRef.current = hash
      toast.success('Transaction confirmed', {
        action: {
          label: 'Basescan',
          onClick: () => window.open(`${EXPLORER}/tx/${hash}`, '_blank'),
        },
      })
      onConfirmedRef.current?.()
      reset()
    } else if (receipt.isError) {
      handledHashRef.current = hash
      toast.error('Transaction failed on-chain')
      reset()
    }
  }, [receipt.isSuccess, receipt.isError, hash, reset])

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
        // TxConfig is a structural subset of the variables writeContractAsync
        // accepts; the generic can't be inferred from a runtime config object,
        // so we assert to that parameter type instead of `never`.
        const hash = await writeContractAsync(config as WriteVariables)
        handledHashRef.current = undefined
        setHash(hash)
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
          : ((err as { shortMessage?: string })?.shortMessage ?? 'Transaction failed')
        toast.error(short)
        return false
      }
    },
    [chainId, isConnected, switchChainAsync, writeContractAsync],
  )

  return { run, isPending: receipt.isLoading }
}
