<template>
  <div>
    <q-field label="id" stack-label>
      <template v-slot:control>
        <div class="self-center full-width no-outline" tabindex="0">{{ qsrc.id }}</div>
      </template>
    </q-field>
    <q-input v-model="qsrc.name" label="Name"></q-input>
    <q-input v-model="qsrc.ticker" label="Ticker"></q-input>
    <q-input v-model="qsrc.exchange" label="Exchange"></q-input>
    <q-input v-model="qsrc.ccy" label="Currency"></q-input>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {QuoteSource} from 'src/lib/assetDb';

  export default Vue.extend({
    name: 'QuoteSourceEditor',
    props: {
      qsrc: Object as () => QuoteSource
    }
  })
</script>

<style scoped>

</style>
