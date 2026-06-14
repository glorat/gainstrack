<template>
    <div>
        <div v-if="networthByAsset.length>0">
            <q-radio v-for="m in modes" :key="m.name" v-model="mode" :val="m.name" :label="m.label"/>
        </div>
        <q-table
                :rows="filteredAssets"
                :columns="allColumns"
                :visible-columns="visibleColumns"
                :loading="loading"
                v-model:pagination="pagination"
                row-key="assetId"
                :selection="selection"
                v-model:selected="selected"
                dense
                v-if="networthByAsset.length>0 || loading"
        >
          <template v-slot:body-cell-units="props" v-if="canEdit">
            <q-td :props="props">
              {{ props.value }} <q-icon :name="matEdit" @click="onUnitsEdit(props)"></q-icon>
              <q-icon v-if="canTrade" :name="matAddCircleOutline" @click="onUnitsTrade(props)"></q-icon>
            </q-td>
          </template>
          <template v-slot:body-cell-price="props" v-if="canEdit">
            <q-td :props="props" @click="onAssetEdit(props)">
              {{ props.value }} <q-icon :name="matEdit"></q-icon>
            </q-td>
          </template>
          <template v-slot:bottom-row>
            <q-tr>
              <q-td v-if="selection"/>
              <q-td>
                Total:
              </q-td>
              <q-td>
              </q-td>
              <q-td class="num">
                {{ totalValueStr }}
              </q-td>
              <q-td />
              <q-td />
            </q-tr>
          </template>
        </q-table>
      <q-btn color="primary" v-if="canEdit" :icon="matAdd" @click="onUnitsEdit({row: {units:0, assetId:''}})" label="Add Known Asset"></q-btn>
      <q-btn color="primary" v-if="canEdit" :icon="matAdd" @click="onNewAsset" label="Add New Asset"></q-btn>

      <q-btn color="secondary" @click="onRebalance" v-if="networthByAsset.length>1" label="Rebalance Calculator"></q-btn>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { date, useQuasar } from 'quasar';
import { NetworthByAsset, AssetColumn, AssetResponse, AssetDTO } from '../lib/assetdb/models';
import { matEdit, matAdd, matAddCircleOutline } from '@quasar/extras/material-icons';
import CommandEditorDialog from 'components/CommandEditorDialog.vue';
import { useAppStore } from 'src/stores';
import { LocalDate } from '@js-joda/core';
import AssetEditorDialog from 'components/AssetEditorDialog.vue';
import { sum } from 'lodash';
import { formatNumber, formatPerc } from 'src/lib/utils';
import NewAssetDialog from 'components/NewAssetDialog.vue';
import { useRouter } from 'vue-router';

interface Mode {
  name: string
  label: string
  columns: string[]
  moreColumns: string
  filter: (nw: NetworthByAsset) => boolean
}

const props = defineProps<{
  accountId?: string;
  assetResponse?: AssetResponse;
  loading?: boolean;
}>();

const store = useAppStore();
const router = useRouter();
const q = useQuasar();

const modes: Mode[] = [
  {
    name: 'value',
    label: 'Current Value',
    columns: ['assetId', 'units', 'value', 'valuePerc', 'price', 'priceDate'],
    moreColumns: '',
    filter: nw => nw.units !== 0.0
  },
  {
    name: 'market',
    label: 'Market Returns',
    columns: ['assetId', 'value', 'price'],
    moreColumns: 'priceMove',
    filter: nw => nw.units !== 0.0 && (nw.priceMoves['1d'] !== 0.0 || date.getDateDiff(date.subtractFromDate(Date.now(), { days: 4 }), nw.priceDate ?? '1900-01-01', 'days') < 0)
  }
];

const mode = ref('value');
const pagination = ref({
  rowsPerPage: 10,
  sortBy: 'value',
  descending: true,
});
const selection = 'multiple' as const;
const selected = ref<NetworthByAsset[]>([]);

const networthByAsset = computed((): NetworthByAsset[] => props.assetResponse?.rows || []);

const moreColumns = computed((): AssetColumn[] =>
  props.assetResponse?.columns.map(col => ({
    ...col,
    field: (row: NetworthByAsset) => row.priceMoves[col.name],
    format: (val: number) => val ? `${(val * 100).toFixed(1)}%` : ''
  } as AssetColumn)) || []
);

const canEdit = computed((): boolean =>
  !!props.accountId && !!store.mainAccounts.find((x: string) => x === props.accountId) && !!props.accountId.match('^(Assets|Liabilities)')
);

const canTrade = computed((): boolean => canEdit.value);

const currentMode = computed((): Mode => {
  const found = modes.find(m => m.name === mode.value);
  if (found) {
    const more: AssetColumn[] = moreColumns.value.filter(x => x.tag === found.moreColumns);
    return { ...found, columns: found.columns.concat(more.map(x => x.name)) };
  }
  return modes[0];
});

const filteredAssets = computed((): NetworthByAsset[] =>
  networthByAsset.value.filter(currentMode.value.filter)
);

const totalValue = computed((): number => sum(filteredAssets.value.map(row => row.value)));

const totalValueStr = computed((): string => formatNumber(totalValue.value));

const visibleColumns = computed((): string[] => currentMode.value.columns);

const columns = computed((): AssetColumn[] => [{
  name: 'assetId',
  label: 'Asset',
  field: 'assetId',
  align: 'left',
  sortable: true
}, {
  name: 'units',
  field: 'units',
  label: 'Units',
  classes: ['num'],
  format: formatNumber
}, {
  name: 'value',
  field: 'value',
  label: store.baseCcy + ' Value',
  classes: ['num'],
  sortable: true,
  format: formatNumber
}, {
  name: 'valuePerc',
  label: '%',
  classes: ['num'],
  field: (row: NetworthByAsset) => row.value / totalValue.value,
  format: formatPerc
}, {
  name: 'price',
  field: 'price',
  label: 'Price',
  classes: ['num'],
  format: formatNumber
}, {
  name: 'priceDate',
  field: 'priceDate',
  label: 'Last Price Date',
  sortable: true,
  classes: ['num']
}]);

const allColumns = computed((): any[] => columns.value.concat(moreColumns.value));

function onUnitsEdit(slotProps: { row: { units: number, assetId: string } }) {
  const row = slotProps.row;
  q.dialog({
    component: CommandEditorDialog,
    componentProps: {
      cmd: {
        commandType: 'balunit',
        accountId: props.accountId,
        date: LocalDate.now().toString(),
        balance: { number: row.units, ccy: row.assetId },
      }
    }
  });
}

function onUnitsTrade(slotProps: { row: { units: number, assetId: string } }) {
  const row = slotProps.row;
  q.dialog({
    component: CommandEditorDialog,
    componentProps: {
      cmd: {
        commandType: 'trade',
        accountId: props.accountId,
        date: LocalDate.now().toString(),
        change: { number: undefined, ccy: row.assetId },
      }
    }
  });
}

function onNewAsset() {
  q.dialog({
    component: NewAssetDialog,
    componentProps: { accountId: props.accountId }
  }).onOk((asset: AssetDTO) => {
    onUnitsEdit({ row: { units: 1, assetId: asset.asset } });
  });
}

function onAssetEdit(slotProps: any) {
  const row: NetworthByAsset = slotProps.row;
  q.dialog({
    component: AssetEditorDialog,
    componentProps: { assetId: row.assetId }
  });
}

function onRebalance(): void {
  router.push({ name: 'rebalance', params: { accountId: props.accountId } });
}
</script>

<style scoped>

</style>
