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
import {defineComponent} from '@vue/composition-api';
import {MyState} from '../../store';

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
        const state: MyState = this.$store.state;
        let cfgs = state.quoteConfig
        if (queryString) {
          cfgs = cfgs.filter(x => x.avSymbol.indexOf(queryString.toUpperCase()) > -1)
        }
        const elems = cfgs.map(cfg => cfg.avSymbol);
        this.tickerOptions = elems;
      });
    },
  }
})
</script>

<style scoped>

</style>
