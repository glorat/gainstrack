import { shallowMount, flushPromises } from '@vue/test-utils'
import { vi } from 'vitest'
import { nextTick } from 'vue'
import AddCmd from 'src/pages/AddCmd.vue'
import CommandEditor from 'src/components/CommandEditor.vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('src/stores', () => ({
  useAppStore: () => ({ baseCcy: 'USD', reload: vi.fn() }),
}))

const mockApiCmdTest = vi.fn()
vi.mock('src/lib/apiFacade', () => ({
  apiCmdTest: (...args: unknown[]) => mockApiCmdTest(...args),
}))

function makeWrapper() {
  return shallowMount(AddCmd, {
    global: {
      stubs: {
        CommandEditor: true,
        SourceErrors: true,
        CommandTable: true,
      },
    },
  })
}

// Simulate the user typing in the CommandEditor child
async function typeCommand(wrapper: ReturnType<typeof makeWrapper>, str: string) {
  const cmdEditor = wrapper.findComponent(CommandEditor)
  await cmdEditor.vm.$emit('gainstrack-changed', str)
  await nextTick()
}

describe('AddCmd', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  // Bug #6: gainstrackChange sets testing.value = true synchronously on every
  // keystroke, before the 1-second debounced testCommand fires. This disables
  // the Add button for the full debounce period + API latency on every key press.
  test('Add button is not disabled immediately after typing (before debounce fires)', async () => {
    vi.useFakeTimers()
    mockApiCmdTest.mockResolvedValue({ added: [], accountChanges: [], errors: [], networthChange: 0 })

    const wrapper = makeWrapper()
    await typeCommand(wrapper, 'earn 2024-01-01 Income:Salary 1000 USD')

    // Debounce has not fired yet — testing should still be false
    const setupState = (wrapper.vm as any).$.setupState
    expect(setupState.testing).toBe(false)
  })

  // Bug #7: testCommand short-circuits with an early return when commandStr is
  // empty, so result.value is never reset. Error messages left over from a
  // previous bad command remain visible after the input is cleared.
  test('error panel is cleared when the command input is emptied', async () => {
    vi.useFakeTimers()
    mockApiCmdTest.mockResolvedValue({
      added: [],
      accountChanges: [],
      errors: [{ message: 'Unexpected token', row: 1, col: 1 }],
      networthChange: 0,
    })

    const wrapper = makeWrapper()

    // Type a bad command and let the debounce + API call complete
    await typeCommand(wrapper, 'bad command text')
    vi.runAllTimers()
    await flushPromises()

    // Errors are now in result.value — the error panel section should be visible.
    // Then the user clears the input and the debounce fires:
    await typeCommand(wrapper, '')
    vi.runAllTimers()
    await flushPromises()

    // After clearing, errors should be gone
    const setupState = (wrapper.vm as any).$.setupState
    expect(setupState.result.errors).toHaveLength(0)
  })
})
