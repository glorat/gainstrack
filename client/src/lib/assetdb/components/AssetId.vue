<template>
  <q-select
    :label="label || 'Asset'"
    :value="value"
    @input-value="onSelectChanged"
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
  import { defineComponent } from 'vue'

  interface MyOpt {
    value: string
    label: string
  }

  /**
   * Depends on $store.getters.allCcys: string[]
   */
  export default defineComponent({
    name: 'AssetId',
    props: {value: String, label: String, inputClass: {}},
    data() {
      return {
        filteredOptions: [] as MyOpt[],
        moreOptions: [] as string[]
      }
    },
    computed: {
      options(): MyOpt[] {
        const stateCcys: string[] = this.$store.getters.allCcys;
        const ccys:string[] = ['', ...this.moreOptions, ...(stateCcys.length>0 ? stateCcys : ['USD'])];
        return ccys.map(ccy => {
          return {value: ccy, label: ccy};
        });
      },
    },
    methods: {
      createValue(val: string, done: any) {
        if (val.length > 0) {
          if (!this.moreOptions.includes(val)) {
            this.moreOptions.push(val)
          }
          done(val, 'toggle')
        }
      },
      filterFn(val: string, update: any) {
        update(() => {
          const needle = val.toUpperCase();
          // FIXME: Support start of string matching first
          // FIXME: Also support matching blank
          this.filteredOptions = this.options.filter(v => v.value.toUpperCase().indexOf(needle) > -1)
        },
          (ref:any) => {
          if (val !== '' && ref.options.length > 0) {
            ref.setOptionIndex(-1) // reset optionIndex in case there is something selected
            ref.moveOptionSelection(1, true) // focus the first selectable option and do not update the input-value
          }
        })
      },
      onSelectChanged(ev: string) {
        if (ev !== this.value) {
          this.$emit('input', ev.toUpperCase());
        }
      },
    }
  })
</script>

<style scoped>

</style>
