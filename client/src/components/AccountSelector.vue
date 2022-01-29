<template>
  <q-select
    :modelValue="value"
    @update:modelValue="onQSelectChanged($event)"
    :options="filteredOptions"
    :label="resolvedPlaceholder"
    :input-class="selectClass"
    use-input
    fill-input
    hide-selected
    input-debounce="0"
    @filter="filterFn"
  />
</template>

<script lang="ts">
  import {defineComponent} from 'vue';
  import {mapGetters} from 'vuex';

  export default defineComponent({
    name: 'AccountSelector',
    props: {
      value: String,
      original: {},
      accountList: Array as () => string[],
      placeholder: String
    },
    data() {
      return {
        filteredOptions: [] as {value: string, label:string}[]
        // items: this.$store.state.summary.accountIds
      };
    },
    computed: {
      ...mapGetters(['accountIds']),
      resolvedPlaceholder(): string {
        return this.placeholder || 'Account';
      },
      accounts(): string[] {
        return this.accountList || this.accountIds;
      },
      options(): { value: string, label: string }[] {
        return this.accounts.map(acctId => {
          return {value: acctId, label: acctId};
        }).sort();

      },
      selectClass(): any {
        const defaulted = this.value !== this.original;
        return {'defaulted-input': defaulted}
      },
    },
    methods: {
      onChanged(ev: any) {
        this.$emit('update:modelValue', ev.target.value);
      },
      onQSelectChanged(ev: { label: string, value: string }) {
        this.$emit('update:modelValue', ev.value);
      },
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
    },

  });
</script>

<style scoped>

</style>
