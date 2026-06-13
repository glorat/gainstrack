<template>
  <q-select
    use-input
    clearable
    :modelValue="value"
    @update:modelValue="$emit('update:modelValue', $event)"
    :options="tickerOptions"
    @filter="tickerSearch"
  />
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {QuoteSource} from '../assetDb';
import {useAppStore} from 'src/stores';

export default defineComponent({
  name: 'TickerSelect',
  setup() { return { store: useAppStore() } },
  props: {
    value: String,
  },
  data() {
    return {
      tickerOptions: [] as string[],
    }
  },
  methods: {
    tickerSearch (queryString: string, update: any) {

      update(() => {
        let cfgs:QuoteSource[] = this.store.quoteConfig;
        if (queryString) {
          cfgs = cfgs.filter(x => x.id.indexOf(queryString.toUpperCase()) > -1)
        }
        const elems = cfgs.map(cfg => cfg.id);
        this.tickerOptions = elems;
      });
    },
  }
})
</script>

<style scoped>

</style>
