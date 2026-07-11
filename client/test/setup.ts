// Global vitest setup
import { config } from '@vue/test-utils'

// shallowMount creates stubs for unregistered components (Quasar, router-link)
// but Vue still warns about each one. Suppress those expected resolution warnings
// while preserving all other Vue warnings.
config.global.config.warnHandler = (msg: string) => {
  if (msg.startsWith('Failed to resolve component')) return
  console.warn('[Vue warn]:', msg)
}
