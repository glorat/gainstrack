import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import ForecastView from 'src/components/forecast/ForecastView.vue'
import { useForecastStore } from 'src/stores/forecast'

describe('ForecastView', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  // Bug #2: input.value.timeunit = LocalDate.now().year() runs unconditionally after
  // restoring from the store, discarding the persisted timeunit every page load.
  // Bug #1 amplifies this: because the local ref is aliased to the store object
  // (not cloned), this mutation propagates directly back into stored state.
  test('restoring from store preserves the saved timeunit', async () => {
    const forecastStore = useForecastStore()
    forecastStore.updateForecastParams({
      input: { timeunit: 2020, income: 5000, expenses: 2000, networth: 10000 },
      strategy: { inflation: 3, roi: 7, expenseMultiple: 25 },
    })

    shallowMount(ForecastView, { global: { plugins: [pinia] } })
    await nextTick()

    // After mount the store should still hold the originally-persisted year.
    // Bug #2 unconditionally overwrites timeunit; bug #1 makes that write land in
    // the store object directly (because the local ref shares the same reference).
    expect(forecastStore.params.input.timeunit).toBe(2020)
  })

  // Bug #1: onMounted does input.value = forecastStore.params.input (alias, not clone).
  // Every subsequent v-model mutation on the form goes directly into store state,
  // bypassing updateForecastParams.
  test('local form state is a copy of store params, not the same object', async () => {
    const forecastStore = useForecastStore()
    forecastStore.updateForecastParams({
      input: { timeunit: 2024, income: 5000, expenses: 2000, networth: 10000 },
      strategy: { inflation: 3, roi: 7, expenseMultiple: 25 },
    })
    const originalInputRef = forecastStore.params.input

    const wrapper = shallowMount(ForecastView, { global: { plugins: [pinia] } })
    await nextTick()

    // Access internal setup state to verify reference identity.
    // We check that the component's local `input` ref is a different object
    // from what the store holds — i.e., changes to local form state go through
    // the watcher/action, not directly into store memory.
    const localInput = (wrapper.vm as any).$.setupState.input
    expect(localInput).not.toBe(originalInputRef)
  })
})
