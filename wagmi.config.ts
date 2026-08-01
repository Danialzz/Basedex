import { defineConfig } from '@wagmi/cli'
import { foundry } from '@wagmi/cli/plugins'

/**
 * Generates typed ABIs + React hooks from Foundry build artifacts.
 *
 * Usage:
 *   cd contracts && forge build      # produce contracts/out/*.json
 *   cd .. && npm run generate        # writes src/generated.ts
 *
 * The generated file is committed so the frontend builds even when
 * `forge` isn't available (CI, fresh clones). Re-run `npm run generate`
 * whenever the contracts change.
 */
export default defineConfig({
  out: 'src/generated.ts',
  plugins: [
    foundry({
      project: 'contracts',
      include: ['MockERC20.sol/**', 'SimplePair.sol/**', 'YieldVault.sol/**'],
    }),
  ],
})
