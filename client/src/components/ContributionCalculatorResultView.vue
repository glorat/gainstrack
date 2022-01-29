<template>
  <div>
    <pre><span v-for="row in data"><template v-if="row.targetValue !== row.value">BUY {{ formatNumber(row.targetValue - row.value) }} {{ baseCcy }} of {{ row.assetId }}<template v-if="row.price!==1"> ({{ formatNumber((row.targetValue - row.value)/row.price) }} {{row.assetId}} @{{ formatNumber(row.price) }} {{baseCcy}})</template></template>
</span></pre>
    <q-table :rows="data" :columns="columns" :pagination="pagination" hide-bottom>
    </q-table>
  </div>
</template>

<script lang="ts">
import {ContributionCalculatorEntries} from '../lib/ContributionCalculator';
import {defineComponent} from 'vue';
import {formatNumber, formatPerc} from 'src/lib/utils';

export default defineComponent({
  name: 'ContributionCalculatorResultView',
  props: {
    data: Array as () => ContributionCalculatorEntries[],
    baseCcy: String
  },
  data() {
    const columns = [
      {name: 'AssetId', field: 'assetId', label: 'Asset'},
      {name: 'target', field: 'target', label: 'Target%', format: formatPerc},
      {name: 'value', field: 'value', label: 'Old Value', format: formatNumber},
      {name: 'deltaValue', field: (row:ContributionCalculatorEntries) => row.targetValue-row.value, label: '+/- Value', format: formatNumber},
      {name: 'deltaUnit', field: (row:ContributionCalculatorEntries) => (row.targetValue-row.value)/(row.price??1), label: 'Buy/Sell', format: formatNumber},
      {name: 'targetValue', field: 'targetValue', label: 'New Value', format: formatNumber},
    ]
    const pagination = {rowsPerPage: 100}
    return {columns, pagination, formatNumber, formatPerc}
  }
})
</script>

<style scoped>

</style>
