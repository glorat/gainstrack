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
            <li v-for="row in related" :key="row.id">
              <router-link :to="{ name: 'quoteSource', params: { id: row.id }}">{{ row.id }} - {{ row.name }}</router-link>
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

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getAllQuoteSources, QuoteSource } from '../assetDb';
import { investmentAssetProperties, quoteSourceFieldProperties } from '../AssetSchema';
import ObjectFieldView from './ObjectFieldView.vue';
import { applyQueries, searchObjToQuery } from '../schema';
import { query, limit as firestoreLimit, CollectionReference } from 'firebase/firestore';

const props = defineProps<{ qsrc: QuoteSource }>();

const related = ref<QuoteSource[]>([]);
const relatedLoading = ref(false);

function hostnameFor(url: string) {
  return new URL(url).hostname;
}

async function refreshRelated() {
  try {
    relatedLoading.value = true;
    const level = 1;
    const limit = 5;
    const cq = searchObjToQuery(props.qsrc, quoteSourceFieldProperties, fld => fld.searchLevel ? fld.searchLevel <= level : false);
    const filter = limit
      ? (col: CollectionReference) => query(applyQueries(col, cq), firestoreLimit(limit))
      : (col: CollectionReference) => applyQueries(col, cq);
    related.value = await getAllQuoteSources(filter);
  } catch (e) {
    console.error(e);
  } finally {
    relatedLoading.value = false;
  }
}

onMounted(() => { refreshRelated(); });
</script>

<style scoped>

</style>
