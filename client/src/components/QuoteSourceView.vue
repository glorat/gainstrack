<template>
  <div class="row q-col-gutter-lg">
    <div class="col-md-6 q-pa-md">
      <q-card class="">
        <q-card-section class="text-h5">
          Quote Key Details
        </q-card-section>
        <q-separator></q-separator>
        <q-card-section>
          <object-field-view class="row" :object="qsrc" :field-properties="quoteSourceFieldProperties"></object-field-view>
        </q-card-section>
      </q-card>

    </div>
    <div class="col-md-6  q-pa-md">
      <q-card>
        <q-card-section class="text-h5">
          Asset Key Facts
        </q-card-section>
        <q-separator></q-separator>
        <q-card-section>
          <object-field-view class="row" :object="qsrc.asset" :field-properties="investmentAssetProperties"></object-field-view>
        </q-card-section>
      </q-card>
    </div>

    <div class="col-md-6  q-pa-md">
      <q-card>
        <q-card-section class="text-h5">
          External References
        </q-card-section>
        <q-separator></q-separator>
        <q-card-section>
          <a v-for="href in qsrc.asset.references" :href="href">{{ hostnameFor(href) }}</a><br>
        </q-card-section>
      </q-card>
    </div>

  </div>

</template>

<script lang="ts">
  import Vue from 'vue';
  import {QuoteSource} from 'src/lib/assetDb';
  import {investmentAssetProperties, quoteSourceFieldProperties} from 'src/lib/AssetSchema';
  import ObjectFieldView from 'components/ObjectFieldView.vue';

  export default Vue.extend({
    name: 'QuoteSourceView',
    components: {ObjectFieldView},
    props: {
      qsrc: Object as () => QuoteSource
    },
    data() {
      return {
        quoteSourceFieldProperties,
        investmentAssetProperties,
      }
    },
    methods: {
      hostnameFor(url:string) {
        return new URL(url).hostname
      }
    },
    computed: {
    }
  })
</script>

<style scoped>

</style>
