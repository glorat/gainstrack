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
          Related Investments
        </q-card-section>
        <q-separator></q-separator>
        <q-card-section>
          <ul>
            <li v-for="row in related" :key="row.id" >
              <router-link :to="{ name: 'quoteSource', params: { id: row.id }}">{{ row.id}} - {{ row.name }}</router-link>
            </li>
          </ul>

        </q-card-section>
        <q-inner-loading :showing="relatedLoading">
          <q-spinner size="50px" color="primary" />
        </q-inner-loading>
      </q-card>
    </div>

    <div class="col-md-6  q-pa-md">
      <q-card>
        <q-card-section class="text-h5">
          External References
        </q-card-section>
        <q-separator></q-separator>
        <q-card-section>
          <ul>
            <li v-for="href in qsrc.asset.references"><a :href="href">{{ hostnameFor(href) }}</a></li>
          </ul>
        </q-card-section>
      </q-card>
    </div>

  </div>

</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {getAllQuoteSources, QuoteSource} from '../assetDb';
import {
  investmentAssetProperties,
  quoteSourceFieldProperties
} from '../AssetSchema';
import ObjectFieldView from './ObjectFieldView.vue';

import {applyQueries, searchObjToQuery} from '../schema';

export default defineComponent({
  name: 'QuoteSourceView',
  components: {ObjectFieldView},
  props: {
    qsrc: {
      type: Object as () => QuoteSource,
      required: true
    }
  },
  data() {
    const related = [] as QuoteSource[];
    const relatedLoading = false;
    return {
      related,
      relatedLoading,
      quoteSourceFieldProperties,
      investmentAssetProperties,
    }
  },
  methods: {
    hostnameFor(url:string) {
      return new URL(url).hostname
    },
    async refreshRelated() {
      try {
        this.relatedLoading = true;
        const level = 1; // TODO: Iterate up levels until we get results
        const limit = 5;
        const cq = searchObjToQuery(this.qsrc, quoteSourceFieldProperties, fld => fld.searchLevel?fld.searchLevel<=level:false)
        const filter = limit ? (col: any) => applyQueries(col, cq).limit(limit) : (col: any) => applyQueries(col, cq)
        this.related = await getAllQuoteSources(filter)
      }
      catch (e) {
        console.error(e);
      } finally {
        this.relatedLoading = false;
      }

    },
  },
  mounted(): void {
    this.refreshRelated();
  },
  computed: {
  }
})
</script>

<style scoped>

</style>
