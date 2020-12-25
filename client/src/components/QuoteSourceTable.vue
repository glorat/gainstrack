<template>
  <q-table :columns="columns" :data="quoteSources" :pagination="pagination"
           dense
           @row-click="onRowClick">

  </q-table>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {QuoteSource} from 'src/lib/assetDb';

  const defaultColumn= (col: {name:string}) => ({field: col.name, align: 'left', sortable: true})
  const columns = [
    {name: 'id', label: 'Id'},
    {name: 'ticker', label: 'Ticker'},
    {name: 'marketRegion', label: 'Region'},
    {name: 'name', label: 'Name', align: 'left'},
    {name: 'ccy', label: 'Ccy'},
    {name: 'type', label: 'Type', field: (row:QuoteSource) => row.asset?.type}
  ].map(col => ({...defaultColumn(col), ...col}))

  export default Vue.extend({
    name: 'QuoteSourceTable',
    props: {
      quoteSources: {
        type: Array as () => QuoteSource[]
      }
    },
    data() {
      const pagination = {
        rowsPerPage: 20
      }
      return {
        columns,
        pagination,
      }
    },
    methods: {
      onRowClick(ev: any, data: QuoteSource) {
        this.$emit('row-click', data)
      }
    }
  })
</script>

<style scoped>

</style>
