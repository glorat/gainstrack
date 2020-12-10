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
      <enum-select v-model="qsrc.marketRegion" label="Source Market Region" :options="marketRegions"></enum-select>
    </q-card-section>
    <q-separator></q-separator>
    <q-card-section >
      <div>External quote sources</div>
      <div v-for="src in qsrc.sources">
        <enum-select v-model="src.sourceType" label="Source Type" :options="quoteSourceTypes"></enum-select>
        <q-input v-model="src.ref" label="Symbol/Ref"></q-input>
        <q-input v-model="src.meta" label="Additional Params"></q-input>
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
  import {marketRegions, QuoteSource, quoteSourceTypes} from 'src/lib/assetDb';
  import EnumSelect from 'components/field/EnumSelect.vue';

  export default Vue.extend({
    name: 'QuoteSourceEditor',
    components: {EnumSelect},
    props: {
      qsrc: Object as () => QuoteSource
    },
    data() {
      return {
        marketRegions,
        quoteSourceTypes
      }
    },
    computed: {
      autoId() : string {
        const qsrc = this.qsrc;
        if (qsrc.ticker && qsrc.marketRegion) {
          if (qsrc.marketRegion === 'GLOBAL') {
            return qsrc.ticker.toUpperCase()
          } else {
            return `${qsrc.ticker.toUpperCase()}.${qsrc.marketRegion.toUpperCase()}`;
          }
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
