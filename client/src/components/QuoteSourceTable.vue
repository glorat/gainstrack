<template>
  <q-table :columns="columns" :data="quoteSources" :pagination="pagination"
           dense
           :loading="loading"
           @row-click="onRowClick">

    <template v-slot:header="props">
      <q-tr :props="props">
        <q-th
          v-for="(col, idx) in props.cols"
          :key="col.name"
          :props="props"
        >
          <template v-if="columnEditing">
            <q-btn-group rounded>
              <q-btn label="<" size="xs" padding="xs" :disable="idx<=0"
                     @click.prevent.stop="swapLeft(idx)"
              ></q-btn>
              <q-btn label="X" size="xs" padding="xs"
                     @click.prevent.stop="deleteColumn(idx)"
              ></q-btn>
              <q-btn label=">" size="xs" padding="xs" :disable="idx>=props.cols.length"
                     @click.prevent.stop="swapLeft(idx+1)"
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

<script lang="ts">
  import Vue from 'vue';
  import {QuoteSource} from 'src/lib/assetDb';
  import {pathToTableColumn, quoteSourceFieldProperties} from 'src/lib/AssetSchema';

  export default Vue.extend({
    name: 'QuoteSourceTable',
    props: {
      quoteSources: {
        type: Array as () => QuoteSource[]
      },
      loading: Boolean,
      selectedColumns: {
        type: Array as () => string[],
        default: ():string[] => {
          const d = ['name', 'ticker', 'marketRegion', 'ccy', 'asset.type'];
          return d;
        }
      },
      columnEditing: Boolean,
      previewing: Boolean,
    },
    data() {
      const pagination = {
        rowsPerPage: 20
      };
      return {
        // columns,
        pagination,
      }
    },
    methods: {
      onRowClick(ev: any, data: QuoteSource) {
        this.$emit('row-click', data)
      },
      deleteColumn(idx: number): void {
        this.selectedColumns.splice(idx,1);
        this.$emit('update:selected-columns', this.selectedColumns);
      },
      swapLeft(idx:number):void {
        const tmp = this.selectedColumns[idx];
        Vue.set(this.selectedColumns, idx, this.selectedColumns[idx-1]);
        Vue.set(this.selectedColumns, idx-1, tmp);
        this.$emit('update:selected-columns', this.selectedColumns);
      }
    },
    computed: {
      columns():Record<string,any>[] {
        return this.selectedColumns
          .map(col => pathToTableColumn(quoteSourceFieldProperties, col))
          .map(col => ({...col, sortable: true}));
      },
    },
    mounted(): void {
      // We are the master
      this.$emit('update:selected-columns', this.selectedColumns);
    }
  })
</script>

<style scoped>

</style>
