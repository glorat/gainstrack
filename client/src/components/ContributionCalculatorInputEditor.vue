<template>
  <div>
    <q-table :rows="displayEntries" :columns="columns" hide-pagination :pagination="pagination">
      <template v-slot:body-cell-target="props">
        <q-td :props="props">
          <q-input v-if="props.rowIndex<displayEntries.length-1" v-model.number="props.row.target" suffix="%"
                   outlined dense
          ></q-input>
          <span v-if="props.rowIndex===displayEntries.length-1">
                {{ formatNumber(props.row.target) }}%
          </span>
        </q-td>
      </template>
    </q-table>
    <div class="row">
      <div class="col-12">
        <balance-editor :modelValue="contribution" @update:modelValue="$emit('update:contribution', $event)"  label="Contribution"></balance-editor>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {ContributionCalculatorInput} from '../lib/ContributionCalculator';
import BalanceEditor from 'src/lib/assetdb/components/BalanceEditor.vue';
import {formatNumber, formatPerc} from 'src/lib/utils';
import {sum} from 'lodash';
import {Amount, AmountEditing} from 'src/lib/assetdb/models';

const props = defineProps<{
  entries: ContributionCalculatorInput[]
  contribution?: Amount
}>();

defineEmits<{ 'update:contribution': [value: AmountEditing] }>();

const pagination = {rowsPerPage: 100};

const totalOriginalValue = computed((): number => sum(props.entries.map(e => e.value)));
const totalTargetPerc = computed((): number => sum(props.entries.map(row => row.target || 0)));

const totalRow = computed((): ContributionCalculatorInput => ({
  assetId: 'Total',
  value: totalOriginalValue.value,
  target: totalTargetPerc.value,
  units: undefined,
  price: undefined,
}));

const displayEntries = computed((): ContributionCalculatorInput[] => [...props.entries, totalRow.value]);

const columns = computed(() => [
  {name: 'AssetId', field: 'assetId', label: 'Asset'},
  {
    name: 'actual',
    field: (row: ContributionCalculatorInput) => row.value / totalOriginalValue.value,
    label: 'Current%',
    format: formatPerc,
  },
  {name: 'value', field: 'value', label: 'Current Value', format: formatNumber},
  {name: 'target', field: 'target', label: 'Target%'},
]);
</script>

<style scoped>

</style>
