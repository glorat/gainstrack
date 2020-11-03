<template>
  <q-table :data="data" :columns="columns" :pagination="pagination" hide-bottom>
  </q-table>
</template>

<script lang="ts">
import {ContributionCalculatorEntries} from '../lib/ContributionCalculator';
import {defineComponent} from '@vue/composition-api';
import {formatNumber, formatPerc} from "src/lib/utils";

export default defineComponent({
  name: 'ContributionCalculatorResultView',
  props: {
    data: Array as () => ContributionCalculatorEntries[]
  },
  data() {
    const columns = [
      {name: 'AssetId', field: 'assetId', label: 'Asset'},
      {name: 'target', field: 'target', label: 'Target%', format: formatPerc},
      {name: 'value', field: 'value', label: 'Old Value', format: formatNumber},
      {name: 'deltaValue', field: row => row.targetValue-row.value, label: '+/- Value', format: formatNumber},
      {name: 'deltaUnit', field: row => (row.targetValue-row.value)/row.price, label: 'Buy/Sell', format: formatNumber},
      {name: 'targetValue', field: 'targetValue', label: 'New Value', format: formatNumber},
    ]
    const pagination = {rowsPerPage: 100}
    return {columns, pagination, formatNumber, formatPerc}
  }
})
</script>

<style scoped>

</style>
