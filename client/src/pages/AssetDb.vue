<template>
  <my-page padding>
    <quote-source-filter v-model:params="params"
                         :selected-columns="selectedColumns" @update:selected-columns="selectedColumns = $event"
                         :column-editing="columnEditing" @update:column-editing="columnEditing = $event"
                         @preview="onPreview"
                         @search="onSearch" ></quote-source-filter>

<!--    <pre>{{ params }}</pre>-->

    <quote-source-table :quote-sources="quoteSources"
                        :selected-columns="selectedColumns" @update:selected-columns="selectedColumns = $event"
                        :column-editing="columnEditing"
                        :loading="loading"
                        :previewing="previewing"
                        @row-click="quoteRowClick" >
    </quote-source-table>

    <q-btn color="primary" label="Create New..." @click="createNew"></q-btn>
  </my-page>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getAllQuoteSources, QuoteSource } from 'src/lib/assetdb/assetDb';
import { debounce } from 'quasar';
import { quoteSourceFieldProperties } from 'src/lib/assetdb/AssetSchema';
import { applyQueries, searchObjToQuery } from 'src/lib/assetdb/schema';
import { query, limit as firestoreLimit, CollectionReference } from 'firebase/firestore';
import { QuoteSourceFilter, QuoteSourceTable } from 'src/lib/assetdb';
import { qnotify } from 'src/boot/notify';

function queryArgsToObj(args: any) {
  try {
    if (args && 'string'===typeof(args)) {
      const params = JSON.parse(args);
      return params;
    } else {
      return undefined;
    }
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

const defaultParams = () => ({query:[], searchObj:{asset:{}}, fields: []});

const router = useRouter();
const route = useRoute();

const quoteSources = ref<QuoteSource[]>([]);
const params = ref<any>(defaultParams());
const previewQuery = ref<any>(undefined);
const loading = ref(false);
const selectedColumns = ref<string[] | undefined>(undefined);
const columnEditing = ref(false);
const previewing = ref(false);

async function refresh() {
  const queryArgs = route.query['args'];
  const newParams = queryArgsToObj(queryArgs) ?? defaultParams();

  // Perform some sanitising/defaulting
  if (!newParams.query) newParams.query = [];
  if (!newParams.searchObj) newParams.searchObj = {asset:{}};
  if (!newParams.fields) newParams.fields = [];

  params.value = newParams;

  if (newParams?.fields && newParams.fields.length > 0) {
    selectedColumns.value = newParams.fields;
  }
  previewing.value = false;
  await applyQuery(newParams);
}

async function applyQuery(queryParams: any) {
  const defaultLimit = 20;
  const actualLimit = defaultLimit;

  try {
    loading.value = true;
    const { query: queryArr, searchObj } = queryParams ?? {};
    const advancedQuery = queryArr ?? [];
    const searchObjQuery = searchObjToQuery(searchObj ?? {}, quoteSourceFieldProperties);
    const cq = [...advancedQuery, ...searchObjQuery];

    if (cq && cq.length && cq[0].where) {
      const filter = (col: CollectionReference) => query(applyQueries(col, cq), firestoreLimit(actualLimit));
      quoteSources.value = await getAllQuoteSources(filter);
    } else {
      quoteSources.value = await getAllQuoteSources((col: CollectionReference) => query(col, firestoreLimit(actualLimit)));
    }
  } catch (error) {
    const e: any = error;
    qnotify.error(e.message ?? e.toString());
  } finally {
    loading.value = false;
  }
}

function onSearch(searchParams: any) {
  const args = JSON.stringify(searchParams);
  // Prevent NavigationDuplicated
  if (route.query?.args !== args) {
    router.push({query: {args}});
  }
}

function onPreview(previewParams: any) {
  previewQuery.value = previewParams;
  doPreview();
}

const doPreview = debounce(async () => {
  onSearch(previewQuery.value);
  // await applyQuery(previewQuery.value, 10);
  // previewing.value = true;
}, 1000);

function createNew() {
  router.push({name: 'quoteSourceNew'});
}

function quoteRowClick(qsrc: QuoteSource) {
  if (qsrc.id) {
    router.push({name: 'quoteSource', params: {id: qsrc.id}});
  }
}

watch(params, (val) => { onPreview(val); }, { deep: true });
watch(route, () => { refresh(); });

onMounted(() => { refresh(); });
</script>

<style scoped>

</style>
