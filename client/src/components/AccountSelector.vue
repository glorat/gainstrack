<template>
  <q-select
    :value="value"
    v-on:input="onQSelectChanged($event)"
    :options="options"
    :label="resolvedPlaceholder"
    :input-class="selectClass"
    use-input
    fill-input
    hide-selected
  />
</template>

<script lang="ts">
  import Vue from 'vue';
  import {mapGetters} from 'vuex';

  export default Vue.extend({
    name: 'AccountSelector',
    props: {
      value: String,
      original: {},
      accountList: Array as () => string[],
      placeholder: String
    },
    data() {
      return {
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
        this.$emit('input', ev.target.value);
      },
      onQSelectChanged(ev: { label: string, value: string }) {
        this.$emit('input', ev.value);
      },
    },

  });
</script>

<style scoped>

</style>
