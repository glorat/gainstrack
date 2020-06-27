<template>
  <q-select
    :value="value"
    v-on:input="onQSelectChanged($event)"
    :options="options"
    :label="resolvedPlaceholder"/>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {Select, Option} from 'element-ui';

  export default Vue.extend({
    name: 'AccountSelector',
    props: {
      value: String,
      accountList: Array as () => string[],
      placeholder: String
    },
    data() {
      return {
        // items: this.$store.state.summary.accountIds
      };
    },
    computed: {
      resolvedPlaceholder(): string {
        return this.placeholder || 'Account';
      },
      accounts(): string[] {
        return this.accountList || this.$store.state.summary.accountIds;
      },
      options(): { value: string, label: string }[] {
        return this.accounts.map(acctId => {
          return {value: acctId, label: acctId};
        });

      }
    },
    methods: {
      onChanged(ev: any) {
        this.$emit('input', ev.target.value);
      },
      onQSelectChanged(ev: { label: string, value: string }) {
        this.$emit('input', ev.value);
      },
    }
  });
</script>

<style scoped>

</style>
