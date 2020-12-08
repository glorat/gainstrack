<template>
  <q-table :data="quoteSources" @row-click="onRowClick">

  </q-table>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {QuoteSource} from 'src/lib/assetDb';

  export default Vue.extend({
    name: 'QuoteSourceTable',
    props: {
      quoteSources: {
        type: Array as () => QuoteSource[]
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
