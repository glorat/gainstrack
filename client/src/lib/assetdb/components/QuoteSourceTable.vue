<template>
  <q-table :columns="columns" :rows="quoteSources" :pagination="pagination"
           dense
           :loading="loading"
           title="Assets"
           @row-click="onRowClick">

    <template v-slot:top-right>
      <q-btn
        size="sm"
        color="primary"
        :icon-right="matArchive"
        label="Export CSV"
        no-caps
        @click="exportTable"
      />
    </template>

    <template v-slot:header="props">
      <q-tr :props="props">
        <q-th
          v-for="(col, idx) in props.cols"
          :key="col.name"
          :props="props"
        >
          <template v-if="columnEditing">
            <q-btn-group rounded>
              <q-btn label="<" size="xs" padding="xs" :disable="(idx as number)<=0"
                     @click.prevent.stop="swapLeft(idx as number)"
              ></q-btn>
              <q-btn label="X" size="xs" padding="xs"
                     @click.prevent.stop="deleteColumn(idx as number)"
              ></q-btn>
              <q-btn label=">" size="xs" padding="xs" :disable="(idx as number)>=props.cols.length"
                     @click.prevent.stop="swapLeft((idx as number)+1)"
              ></q-btn>
            </q-btn-group>
            <br>
          </template>
          {{ col.label }}
        </q-th>
      </q-tr>
    </template>

    <template v-slot:bottom v-if="previewing">
      <em>Previewing top 10 results. Press search for full results</em>
    </template>
  </q-table>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { QuoteSource } from '../assetDb';
import { quoteSourceFieldProperties } from '../AssetSchema';
import { matArchive } from '@quasar/extras/material-icons';
import { stringify } from 'csv-stringify/browser/esm/sync';
import { exportFile, useQuasar } from 'quasar';
import { pathToTableColumn } from '../schema';

const props = withDefaults(defineProps<{
  quoteSources: QuoteSource[]
  loading?: boolean
  selectedColumns?: string[]
  columnEditing?: boolean
  previewing?: boolean
}>(), {
  selectedColumns: (): string[] => ['name', 'ticker', 'marketRegion', 'ccy', 'asset.type']
});

const emit = defineEmits<{
  'row-click': [data: QuoteSource]
  'update:selected-columns': [value: string[]]
}>();

const $q = useQuasar();
const pagination = ref({ rowsPerPage: 20 });

const columns = computed((): any[] =>
  props.selectedColumns
    .map(col => pathToTableColumn(quoteSourceFieldProperties, col))
    .map(col => ({ ...col, sortable: true }))
);

function onRowClick(ev: any, data: QuoteSource) {
  emit('row-click', data);
}

function deleteColumn(idx: number): void {
  const a = [...props.selectedColumns];
  a.splice(idx, 1);
  emit('update:selected-columns', a);
}

function swapLeft(idx: number): void {
  const a = [...props.selectedColumns];
  const tmp = a[idx];
  a[idx] = a[idx - 1];
  a[idx - 1] = tmp;
  emit('update:selected-columns', a);
}

function exportTable() {
  const tableColumns = columns.value;
  const records = props.quoteSources.map(qs => {
    const row: Record<string, any> = {};
    const qsRecord = qs as unknown as Record<string, any>;
    tableColumns.forEach(col => { row[col.label] = col.field ? col.field(qs) : qsRecord[col.name]; });
    return row;
  });
  const columnNames = tableColumns.map(col => col.label ?? col.name);
  const data = stringify(records, { columns: columnNames, header: true });
  const status = exportFile('table-export.csv', data, 'text/csv');
  if (status !== true) {
    $q.notify({ message: 'Browser denied file download...', color: 'negative', icon: 'warning' });
  }
}

onMounted(() => { emit('update:selected-columns', props.selectedColumns); });
</script>

<style scoped>

</style>
