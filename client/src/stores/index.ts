import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export { useAppStore, type AppStore, type TimeSeries, type AccountBalances } from './app'
export { useForecastStore } from './forecast'

export default function () {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  return pinia
}
