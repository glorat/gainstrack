import { shallowMount } from '@vue/test-utils'
import { vi } from 'vitest'
import AssetView from 'src/components/AssetView.vue'
import type { AssetResponse } from 'src/lib/assetdb/models'

// Installing Quasar as a plugin crashes in jsdom; spread real exports and
// override only the composable so the module stays intact for other imports.
vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useQuasar: () => ({ dialog: vi.fn() }),
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// useAppStore is mocked per-test via mockReturnValue below
vi.mock('src/stores', () => ({
  useAppStore: vi.fn(),
}))

import { useAppStore } from 'src/stores'

function makeStore(mainAccounts: string[] = []) {
  vi.mocked(useAppStore).mockReturnValue({
    mainAccounts,
    baseCcy: 'USD',
  } as any)
}

const globalOpts = {}

describe('AssetView', () => {
  // Bug #9: props.assetResponse?.columns.map(...) — the ?. only guards against
  // assetResponse being null/undefined. If assetResponse is present but its
  // `columns` field is absent, `.map` is called on undefined → TypeError.
  test('renders without error when assetResponse is present but has no columns field', () => {
    makeStore()
    const assetResponseWithoutColumns = { rows: [] } as unknown as AssetResponse

    expect(() =>
      shallowMount(AssetView, {
        props: { assetResponse: assetResponseWithoutColumns },
        global: globalOpts,
      })
    ).not.toThrow()
  })

  // Bug #10: the regex '^(Assets|Liabilities)' has no separator, so account names
  // like 'AssetsOld:Cash' match even though they are not real Assets/Liabilities
  // accounts. The edit buttons should not appear for such accounts.
  test('edit buttons are hidden for accounts that only superficially match the Assets/Liabilities prefix', async () => {
    makeStore(['AssetsOld:Cash'])

    const wrapper = shallowMount(AssetView, {
      props: {
        accountId: 'AssetsOld:Cash',
        // Include columns to avoid the bug #9 crash
        assetResponse: { rows: [], columns: [] } as unknown as AssetResponse,
      },
      global: globalOpts,
    })

    // When canEdit is incorrectly true the "Add Known Asset" and "Add New Asset"
    // buttons are rendered; they should be absent for a non-canonical account name.
    const editButtons = wrapper
      .findAll('q-btn-stub')
      .filter(btn =>
        btn.attributes('label') === 'Add Known Asset' ||
        btn.attributes('label') === 'Add New Asset'
      )
    expect(editButtons).toHaveLength(0)
  })
})
