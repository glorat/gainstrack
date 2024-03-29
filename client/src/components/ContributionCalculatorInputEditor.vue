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

<script lang="ts">
import {ContributionCalculatorInput} from '../lib/ContributionCalculator';
import BalanceEditor from 'src/lib/assetdb/components/BalanceEditor.vue';
import {formatNumber, formatPerc} from 'src/lib/utils';
import {sum} from 'lodash';
import {Amount} from 'src/lib/assetdb/models';
import { defineComponent, PropType } from 'vue'

export default defineComponent({
  name: 'ContributionCalculatorInputEditor',
  components: {
    BalanceEditor
  },
  props: {
    entries: {
      type: (Array as unknown) as PropType<ContributionCalculatorInput[]>,
      required: true
    },
    contribution: (Object as unknown) as PropType<Amount>,
  },
  data() {
    const pagination = {rowsPerPage: 100}
    const c = this.contribution;
    return {
      formatPerc,
      formatNumber,
      pagination,
      c
    }
  },
  computed: {
    columns(): Record<string, unknown>[] {
      return [
        {name: 'AssetId', field: 'assetId', label: 'Asset'},
        {
          name: 'actual',
          field: (row: ContributionCalculatorInput) => row.value / this.totalOriginalValue,
          label: 'Current%',
          format: formatPerc
        },
        {name: 'value', field: 'value', label: 'Current Value', format: formatNumber},
        {name: 'target', field: 'target', label: 'Target%'},

      ];
    },
    totalOriginalValue(): number {
      return sum(this.entries.map(e => e.value))
    },
    totalTargetPerc():number {
      return sum(this.entries.map(row => row.target || 0))
    },
    totalRow(): ContributionCalculatorInput {
      return {
        assetId: 'Total',
        value: this.totalOriginalValue,
        target: this.totalTargetPerc,
        units: undefined,
        price: undefined
      }
    },
    displayEntries(): ContributionCalculatorInput[] {
      return [...this.entries, this.totalRow]
    }
  }
})
</script>

<style scoped>

</style>
