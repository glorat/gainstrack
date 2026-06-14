<template>
  <my-page padding>
    <h5>Market Quotes</h5>
    <p>
      Note: These are raw market prices for the selected assets. As raw prices, they are not useful for determining
      total returns as they do not include dividends, stock splits etc.
    </p>

    <vue-plotly :data="series" :layout="layout" :options="options" auto-resize></vue-plotly>

    <q-table dense row-key="id" :columns="columns" v-model:pagination="pagination" v-model:selected="selected" selection="single" :rows="quoteConfig"></q-table>
  </my-page>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { VuePlotly } from 'src/lib/loader';
import { QuoteSource } from 'src/lib/assetdb/assetDb';
import { useAppStore } from 'src/stores';

const store = useAppStore();

const defaultColumn = (col: { name: string }) => ({ field: col.name, align: 'left' as const, sortable: true });
const columns: any[] = [
  { name: 'id', label: 'Id' },
  { name: 'ticker', label: 'Ticker' },
  { name: 'marketRegion', label: 'Region' },
  { name: 'name', label: 'Name', align: 'left' },
  { name: 'ccy', label: 'Ccy' },
].map(col => ({ ...defaultColumn(col), ...col }));

const pagination = ref({ rowsPerPage: 50 });
const selected = ref<QuoteSource[]>([]);
const quoteConfig = store.quoteConfig;
const currentRow = ref<QuoteSource | undefined>(undefined);
const series = ref<Record<string, unknown>[]>([{
  x: [],
  y: [],
  type: 'scatter',
  hoverinfo: 'x+y',
}]);
const layout = {
  autosize: true,
  showlegend: true,
  xaxis: { nticks: 20 },
  yaxis: { zeroline: true, hoverformat: ',.0f' },
  height: 250,
  hovermode: 'closest',
  margin: { l: 30, r: 30, b: 50, t: 30, pad: 0 },
};
const options = { displaylogo: false };

async function handleCurrentChange(val: QuoteSource) {
  currentRow.value = val;
  const response = { data: await store.loadQuotes(val.id) };
  series.value = [{
    ...response.data,
    type: 'scatter',
    hoverinfo: 'x+y',
  }];
}

watch(selected, val => { handleCurrentChange(val[0]); });
</script>

<style scoped>

</style>
