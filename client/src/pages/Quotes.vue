<template>
  <my-page padding>
    <h5>Market Quotes</h5>
    <p>
      Note: These are raw market prices for the selected assets. As raw prices, they are not useful for determining
      total returns as they do not include dividends, stock splits etc.
    </p>

    <vue-plotly :data="series" :layout="layout" :options="options" auto-resize></vue-plotly>

    <el-table
      ref="quoteConfig"
      :data="quoteConfig"
      highlight-current-row
      @current-change="handleCurrentChange"
      size="mini"
      style="width: 100%">
      <el-table-column
        type="index"
        width="50">
      </el-table-column>
      <el-table-column
        property="avSymbol"
        label="Ticker"
        width="120">
      </el-table-column>
    </el-table>
  </my-page>
</template>

<script lang="ts">
  import VuePlotly from '../components/Plotly.vue';
  // eslint-disable-next-line no-unused-vars
  import {QuoteConfig} from '@/models';
  import {Table, TableColumn} from 'element-ui';
  import Vue from 'vue';

  interface MyData {
    quoteConfig: QuoteConfig,
    currentRow?: QuoteConfig,
    series: Record<string, unknown>[],
    layout: Record<string, unknown>,
    options: Record<string, unknown>
  }

  export default Vue.extend({
    name: 'Quotes',
    components: {
      'el-table': Table,
      'el-table-column': TableColumn,
      VuePlotly
    },
    data(): MyData {
      const cfg = this.$store.state.quoteConfig;
      return {
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
