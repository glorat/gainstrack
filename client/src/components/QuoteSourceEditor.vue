<template>
  <div>
    <q-field label="id" stack-label>
      <template v-slot:control>
        <div class="self-center full-width no-outline" tabindex="0">{{ qsrc.id }}</div>
      </template>
    </q-field>
    <q-input v-model="qsrc.name" label="Name"></q-input>
    <q-input v-model="qsrc.ticker" label="Ticker"></q-input>
    <q-select v-model="qsrc.marketRegion" label="Market Region"
              :options="marketRegions" emit-value
    >
      <template v-slot:option="scope">
        <q-item v-bind="scope.itemProps" v-on="scope.itemEvents">
          <q-item-section>
            <q-item-label>{{ scope.opt.value }}</q-item-label>
            <q-item-label caption>{{ scope.opt.description }}</q-item-label>
          </q-item-section>
        </q-item>
      </template>
    </q-select>
    <q-input v-model="qsrc.exchange" label="Exchange"></q-input>
    <q-input v-model="qsrc.ccy" label="Currency"></q-input>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {marketRegions, QuoteSource, upsertQuoteSource} from 'src/lib/assetDb';

  export default Vue.extend({
    name: 'QuoteSourceEditor',
    props: {
      qsrc: Object as () => QuoteSource
    },
    data() {
      return {
        marketRegions
      }
    },
    computed: {
      autoId() : string|undefined {
        const qsrc = this.qsrc;
        if (qsrc.ticker && qsrc.marketRegion) {
          return `${qsrc.ticker.toUpperCase()}.${qsrc.marketRegion.toUpperCase()}`;
        }
        return undefined;
      }
    },
    watch: {
      autoId() {
        this.qsrc.id = this.autoId;
      }
    }
  })
</script>

<style scoped>

</style>
