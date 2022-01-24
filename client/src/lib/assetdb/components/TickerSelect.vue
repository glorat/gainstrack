<template>
  <q-select
    use-input
    clearable
    :value="value"
    @input="$emit('input', $event)"
    :options="tickerOptions"
    @filter="tickerSearch"
  />
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {QuoteSource} from '../assetDb';

/**
 * Depends on $store.state.quoteConfig: QuoteSource[]
 */
export default defineComponent({
  name: 'TickerSelect',
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
        let cfgs:QuoteSource[] = this.$store.state.quoteConfig;
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
