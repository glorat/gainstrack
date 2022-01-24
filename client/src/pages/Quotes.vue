<template>
  <my-page padding>
    <h5>Market Quotes</h5>
    <p>
      Note: These are raw market prices for the selected assets. As raw prices, they are not useful for determining
      total returns as they do not include dividends, stock splits etc.
    </p>

    <vue-plotly :data="series" :layout="layout" :options="options" auto-resize></vue-plotly>

    <q-table dense row-key="id" :columns="columns" v-model:pagination="pagination" v-model:selected="selected" selection="single" :data="quoteConfig"></q-table>
  </my-page>
</template>

<script lang="ts">
  import {defineComponent} from 'vue';
  import {VuePlotly} from 'src/lib/loader';
  import {QuoteSource} from 'src/lib/assetdb/assetDb';

  interface MyData {
    pagination: unknown,
    selected: unknown[],
    columns: Record<string, unknown>[],
    quoteConfig: QuoteSource[],
    currentRow?: QuoteSource,
    series: Record<string, unknown>[],
    layout: Record<string, unknown>,
    options: Record<string, unknown>
  }

  export default defineComponent({
    name: 'Quotes',
    components: {
      VuePlotly
    },
    data(): MyData {
      const cfg = this.$store.state.quoteConfig;

      const defaultColumn= (col: {name:string}) => ({field: col.name, align: 'left', sortable: true})
      const columns = [
        {name: 'id', label: 'Id'},
        {name: 'ticker', label: 'Ticker'},
        {name: 'marketRegion', label: 'Region'},
        {name: 'name', label: 'Name', align: 'left'},
        {name: 'ccy', label: 'Ccy'},
      ].map(col => ({...defaultColumn(col), ...col}))


      return {
        pagination: {
          rowsPerPage: 50
        },
        selected: [],
        columns: columns,
        quoteConfig: cfg,
        currentRow: undefined,
        series: [{
          x: [],
          y: [],
          type: 'scatter',
          hoverinfo: 'x+y',
        }
        ],
        layout: {
          autosize: true,
          showlegend: true,
          xaxis: {nticks: 20},
          yaxis: {zeroline: true, hoverformat: ',.0f'},
          height: 250,
          hovermode: 'closest',
          margin: {
            l: 30,
            r: 30,
            b: 50,
            t: 30,
            pad: 0
          },
        },
        options: {displaylogo: false},
      };
    },
    watch: {
      selected(val:QuoteSource[]) {
        this.handleCurrentChange(val[0])
      }
    },
    methods: {
      async handleCurrentChange(val: QuoteSource) {
        this.currentRow = val;
        const response = {data: await this.$store.dispatch('loadQuotes', val.id)};
        // const response = await axios.get('/api/quotes/ticker/' + val.avSymbol);
        const series = {
          ...response.data,
          type: 'scatter',
          hoverinfo: 'x+y',
        };
        this.series = [series];
      }
    }
  })
</script>

<style scoped>

</style>
