import { defineStore } from 'pinia'

export const useForecastStore = defineStore('forecast', {
  state: () => ({ params: undefined as any }),
  actions: {
    updateForecastParams(params: any) {
      this.params = params
    }
  },
  persist: true
})
