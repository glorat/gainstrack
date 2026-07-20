import { describe, test, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import axios from 'axios'
import { useAppStore } from 'src/stores/app'

vi.mock('axios')

// The source an anonymous user types into the editor. Kept minimal (single USD
// account, no FX) so generateAllStateSafe has no quote dependencies.
const USER_TEXT = [
  'option "operating_currency" "USD"',
  '2020-01-01 open Assets:Bank USD',
  '2020-01-01 open Equity:Opening USD',
  '2020-01-02 bal Assets:Bank 100 USD Equity:Opening',
].join('\n')

// What the server would hand back if the editor ever fetched /api/editor/.
// The bug caused exactly this value to clobber the user's typed content.
const SERVER_TEXT = ';; server default source — anonymous editor must never load this'

describe('anonymous editor content persistence (app store)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(axios.post).mockImplementation((url: string) => {
      if (url === '/api/editor/') return Promise.resolve({ data: { source: SERVER_TEXT } })
      if (url === '/api/quotes/tickers') return Promise.resolve({ data: [] })
      return Promise.resolve({ data: {} })
    })
  })

  // Repro: an anonymous user saves in the editor (setGainstrackText + loadLocalText),
  // then returns to the editor (fetchGainstrackText). They must get their own text
  // back from the in-memory cache, NOT a network fetch of the server default.
  test('returning to the editor after a local save restores the typed text', async () => {
    const store = useAppStore()

    store.setGainstrackText(USER_TEXT)
    const res = await store.loadLocalText(USER_TEXT)
    expect(res.ok).toBe(true)

    // Balance sheet computed fine either way — the regression is purely the text.
    const restored = await store.fetchGainstrackText()

    expect(restored).toBe(USER_TEXT)
    expect(store.gainstrackText).toBe(USER_TEXT)
    expect(axios.post).not.toHaveBeenCalledWith('/api/editor/')
  })
})
