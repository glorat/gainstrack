<template>
  <q-select
    :label="label || 'Asset'"
    :value="value"
    @input="onSelectChanged"
    use-input
    hide-selected
    fill-input
    input-debounce="0"
    :options="filteredOptions"
    @filter="filterFn"
    :input-class="inputClass"
  ></q-select>
<!--  hint="Asset/Ccy"-->
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
    props: {value: String, label: String, inputClass: {}},
    data() {
      return {
        filteredOptions: [] as MyOpt[]
      }
    },
    computed: {
      options(): MyOpt[] {
        const state = this.$store.state;
        const summary: StateSummaryDTO = state.allState;
        const ccys = (summary.ccys.length>0 ? summary.ccys : ['USD']);
        ccys.unshift('');
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
        },
          (ref:any) => {
          if (val !== '' && ref.options.length > 0) {
            ref.setOptionIndex(-1) // reset optionIndex in case there is something selected
            ref.moveOptionSelection(1, true) // focus the first selectable option and do not update the input-value
          }
        })
      },
      onSelectChanged(ev: {value:string, label:string}) {
        this.$emit('input', ev.value.toUpperCase());
      },
    }
  })
</script>

<style scoped>

</style>
