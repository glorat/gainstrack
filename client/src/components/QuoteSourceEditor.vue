<template>
  <q-card>
    <q-card-section>
<!--      <q-field label="id" stack-label>-->
<!--        <template v-slot:control>-->
<!--          <div class="self-center full-width no-outline" tabindex="0">{{ qsrc.id }}</div>-->
<!--        </template>-->
<!--      </q-field>-->
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
    </q-card-section>
    <q-separator></q-separator>
    <q-card-section title="asdf">
      <div>External quote sources</div>
      <div v-for="src in qsrc.sources">
        <q-input v-model="src.sourceType" label="Source Type"></q-input>
        <q-input v-model="src.ref" label="Symbol/Ref"></q-input>
      </div>
      <q-btn @click="qsrc.sources.push({sourceType:'', ref: ''})" color="primary" label="+"></q-btn>
    </q-card-section>
    <q-separator></q-separator>
    <q-card-section>

      <q-input v-model="qsrc.ccy" label="Currency"></q-input>
      <q-input v-model="qsrc.exchange" label="Exchange"></q-input>

    </q-card-section>


  </q-card>
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
      autoId() : string {
        const qsrc = this.qsrc;
        if (qsrc.ticker && qsrc.marketRegion) {
          return `${qsrc.ticker.toUpperCase()}.${qsrc.marketRegion.toUpperCase()}`;
        }
        return '';
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
