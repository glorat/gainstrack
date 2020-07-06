<template>
  <my-page padding>
    <h5>Market Quotes</h5>
    <p>
      Note: These are raw market prices for the selected assets. As raw prices, they are not useful for determining
      total returns as they do not include dividends, stock splits etc.
    </p>

    <vue-plotly :data="series" :layout="layout" :options="options" auto-resize></vue-plotly>

    <q-table dense row-key="avSymbol" :columns="columns" :pagination.sync="pagination" :selected.sync="selected" selection="single" :data="quoteConfig"></q-table>
  </my-page>
</template>

<script lang="ts">
  import VuePlotly from '../components/Plotly.vue';
  import {QuoteConfig} from '../lib/models';
  import Vue from 'vue';

  interface MyData {
    pagination: unknown,
    selected: unknown[],
    columns: Record<string, unknown>[],
    quoteConfig: QuoteConfig,
    currentRow?: QuoteConfig,
    series: Record<string, unknown>[],
    layout: Record<string, unknown>,
    options: Record<string, unknown>
  }

  export default Vue.extend({
    name: 'Quotes',
    components: {
      VuePlotly
    },
    data(): MyData {
      const cfg = this.$store.state.quoteConfig;
      const columns = [{
        name: 'avSymbol',
        field: 'avSymbol',
        label: 'Symbol',
        sortable: true,
        align: 'left',
      }, {

      }];
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
      selected(val:QuoteConfig[]) {
        this.handleCurrentChange(val[0])
      }
    },
    methods: {
      async handleCurrentChange(val: QuoteConfig) {
        this.currentRow = val;
        const response = {data: await this.$store.dispatch('loadQuotes', val.avSymbol)};
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
