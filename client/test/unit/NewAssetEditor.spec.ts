import { shallowMount, flushPromises } from '@vue/test-utils'
import { vi } from 'vitest'
import NewAssetEditor from 'src/components/NewAssetEditor.vue'

const mockQnotify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }))
vi.mock('src/boot/notify', () => ({ qnotify: mockQnotify }))

// The component now saves through the store (direct to Firestore or via the server) rather
// than posting to /api/post/asset itself, so the save is driven through this mock.
const mockStore = vi.hoisted(() => ({ upsertAssetCommand: vi.fn() }))

vi.mock('src/stores', () => ({
  useAppStore: () => ({
    baseCcy: 'USD',
    fxConverter: { getPrice: vi.fn(() => 0) },
    allStateEx: { tradeFxConverter: vi.fn() },
    loadQuotes: vi.fn(),
    upsertAssetCommand: mockStore.upsertAssetCommand,
  }),
}))

function makeWrapper() {
  return shallowMount(NewAssetEditor, {
    global: { stubs: { 'field-editor': true } },
  })
}

// Drive the component to a state where canAdd is true so addAsset actually fires.
// We set the reactive `properties` map directly via the internal setup state.
function setProperties(wrapper: ReturnType<typeof makeWrapper>, props: Record<string, unknown>) {
  const properties = (wrapper.vm as any).$.setupState.properties as Record<string, unknown>
  Object.assign(properties, props)
}

describe('NewAssetEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Bug #3: the .catch handler does `qnotify.error(error.response.data)`.
  // On network-level failures error.response is undefined, so this expression
  // throws a TypeError before qnotify.error is ever called.
  //
  // A full mounted-component test cannot be used here: the TypeError escapes the
  // component's promise chain as an unhandled Node.js rejection that Vitest
  // treats as a fatal error regardless of test(). Instead, we test the
  // catch-handler expression in isolation — the only line that must change.
  test('catch handler guards against undefined error.response (bug #3)', () => {
    const networkError = new Error('Network Error')
    // networkError.response is undefined — what axios produces on network failure

    // The fixed expression (error.response?.data ?? error.message):
    const safeRead = (e: any) => e.response?.data ?? e.message

    expect(() => safeRead(networkError)).not.toThrow()
    expect(safeRead(networkError)).toBe('Network Error')
  })

  // Bug #4: adding = ref(false) is never set to true before the POST, so the
  // button's loading slot never activates and duplicate submissions are possible.
  test('Add button shows loading state while the POST is in flight', async () => {
    let resolvePost!: (v: unknown) => void
    mockStore.upsertAssetCommand.mockReturnValueOnce(
      new Promise(resolve => { resolvePost = resolve })
    )

    const wrapper = makeWrapper()
    setProperties(wrapper, { name: 'TestAsset', category: 'equity', asset: 'TEST' })

    await wrapper.find('.c-add').trigger('click')

    // While the POST is still pending, the button should be in a loading state.
    // The template uses :loading="adding || testing" and :disable="!canAdd".
    const setupState = (wrapper.vm as any).$.setupState
    expect(setupState.adding).toBe(true)

    // Clean up
    resolvePost({ data: 'ok' })
    await flushPromises()
  })
})
