<template>
  <q-select
    :label="label"
    :value="value"
    @input-value="onSelectChanged"
    use-input
    hide-selected
    fill-input
    input-debounce="0"
    :options="filteredOptions"
    hint="Asset/Ccy"
    @filter="filterFn"
  ></q-select>
</template>

<script lang="ts">
  // eslint-disable-next-line no-unused-vars
  import {StateSummaryDTO} from '../lib/models';
  import Vue from 'vue';

  interface MyOpt {
    value: string
    label: string
  }

  export default Vue.extend({
    name: 'AssetId',
    props: {value: String, label: String},
    data() {
      return {
        filteredOptions: [] as MyOpt[]
      }
    },
    computed: {
      options(): MyOpt[] {
        const state = this.$store.state;
        const summary: StateSummaryDTO = state.allState;
        const ccys = summary.ccys.length>0 ? summary.ccys : ['USD'];
        return ccys.map(ccy => {
          return {value: ccy, label: ccy};
        });
      },
    },
    methods: {
      filterFn(val: string, update: any) {
        update(() => {
          const needle = val.toUpperCase();
          this.filteredOptions = this.options.filter(v => v.value.toUpperCase().indexOf(needle) > -1)
        })
      },
      onSelectChanged(ev: string) {
        this.$emit('input', ev.toUpperCase());
      },
    }
  })
</script>

<style scoped>

</style>
