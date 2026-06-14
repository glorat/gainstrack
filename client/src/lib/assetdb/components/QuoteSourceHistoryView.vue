<template>
  <div>
    <q-table :rows="history" :columns="columns" v-model:expanded="expanded" :loading="loading">
      <template v-slot:body="props">
        <q-tr :props="props" @click="onRowClick" style="cursor: pointer">
          <q-td
            v-for="col in props.cols"
            :key="col.name"
            :props="props"
          >
            {{ col.value }}
          </q-td>
        </q-tr>
        <q-tr v-if="props.expand" :props="props">
          <q-td colspan="100%">
            <div class="text-left q-gutter-sm">
              <q-table :rows="props.row.diffs"></q-table>
              <q-btn color="warning" disable label="Revert To This"></q-btn>
            </div>
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getDisplayNames, getQuoteSourceHistory, QuoteSource, QuoteSourceHistory } from '../assetDb';
import { quoteSourceFieldProperties } from '../AssetSchema';
import { get } from 'lodash';
import { getFieldNameList } from '../schema';

interface DiffRow { path: string; label: string; before: any; after: any }
interface QuoteSourceHistoryEx extends QuoteSourceHistory { diffs: DiffRow[] }

function diffQuoteSource(q1: QuoteSource, q2: QuoteSource): DiffRow[] {
  const flds = getFieldNameList(quoteSourceFieldProperties);
  const ret: DiffRow[] = [];
  flds.forEach(fld => {
    const path = fld.value;
    const v1 = get(q1, path);
    const v2 = get(q2, path);
    if (v1 !== v2) { ret.push({ path, label: fld.label, before: v1, after: v2 }); }
  });
  return ret;
}

function enrichQuoteSourceHistory(history: QuoteSourceHistory[]): QuoteSourceHistoryEx[] {
  return history.map(row => {
    const nowRevision = row.payload.lastUpdate?.revision ?? 0;
    const before = history.find(x => (x.payload.lastUpdate?.revision ?? 0) === nowRevision - 1);
    const diffs = diffQuoteSource(before?.payload ?? ({} as QuoteSource), row.payload);
    return { ...row, diffs };
  });
}

const props = defineProps<{ qsrc?: QuoteSource }>();

const history = ref<QuoteSourceHistoryEx[]>([]);
const loading = ref(false);
const expanded = ref<string[]>([]);
const displayNameMap = ref<Record<string, string | undefined>>({});

function onRowClick() { console.log('row clicked'); }

async function refresh() {
  loading.value = true;
  try {
    const h = await getQuoteSourceHistory(props.qsrc!.id);
    history.value = enrichQuoteSourceHistory(h);
    displayNameMap.value = await getDisplayNames(h.map(x => x.uid));
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

const columns = computed(() => [
  {
    name: 'revision',
    label: 'Revision',
    field: (row: QuoteSourceHistory) => 1 + (row.payload.lastUpdate?.revision ?? 0)
  },
  {
    name: 'timestamp',
    label: 'Timestamp',
    field: (row: QuoteSourceHistory) => row.createTime.seconds * 1000,
    format: (x: number) => new Date(x).toLocaleString()
  },
  {
    name: 'author',
    label: 'Author Id',
    field: (row: QuoteSourceHistory) => displayNameMap.value[row.uid] ?? row.uid
  },
]);

onMounted(() => { refresh(); });
</script>

<style scoped>

</style>
