<template>
  <div>
    <q-table :data="history" :columns="columns" v-model:expanded="expanded" :loading="loading">
      <template v-slot:body="props">
        <q-tr :props="props" @click="props.expand = !props.expand" style="cursor: pointer">
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
              <q-table :data="props.row.diffs"></q-table>
              <q-btn color="warning" disable label="Revert To This"></q-btn>
            </div>
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script lang="ts">
  import {defineComponent} from 'vue';
  import {getDisplayNames, getQuoteSourceHistory, QuoteSource, QuoteSourceHistory} from '../assetDb';
  import {mdiAlert} from '@quasar/extras/mdi-v5';
  import {quoteSourceFieldProperties} from '../AssetSchema';
  import {get} from 'lodash';
  import {getFieldNameList} from '../schema';

  interface DiffRow {
    path: string,
    label: string,
    before: any,
    after: any,
  }

  interface QuoteSourceHistoryEx extends QuoteSourceHistory {
    diffs: DiffRow[]
  }

  function diffQuoteSource(q1: QuoteSource, q2: QuoteSource): DiffRow[] {
    const flds = getFieldNameList(quoteSourceFieldProperties);
    const ret:DiffRow[] = [];
    flds.forEach(fld => {
      const path = fld.value;
      const v1 = get(q1, path);
      const v2 = get(q2, path);
      if (v1 !== v2) {
        ret.push({path, label: fld.label,before: v1, after: v2})
      }
    });
    return ret;
  }

  function enrichQuoteSourceHistory(history: QuoteSourceHistory[]): QuoteSourceHistoryEx[] {
    const rows = history.map(row => {
      const nowRevision = (row.payload.lastUpdate?.revision ?? 0);
      const before = history.find(x => (x.payload.lastUpdate?.revision ?? 0) === nowRevision-1);
      const diffs = diffQuoteSource(before?.payload ?? ({} as QuoteSource), row.payload);
      return {...row, diffs}
    });
    return rows;
  }

  export default defineComponent({
    name: 'QuoteSourceHistoryView',
    props: {
      qsrc: Object as () => QuoteSource
    },
    data() {
      const expanded: string[] = [];
      const history: QuoteSourceHistoryEx[] = [];
      const loading = false;
      const displayNameMap: Record<string, string | undefined> = {};
      return {
        mdiAlert,
        history,
        loading,
        expanded,
        displayNameMap,
      }
    },
    methods: {
      async refresh() {
        this.loading = true;
        try {
          const history = await getQuoteSourceHistory(this.qsrc!.id);
          this.history = enrichQuoteSourceHistory(history);
          this.displayNameMap = await getDisplayNames(history.map(x => x.uid));

        } catch (e) {
          console.error(e)
        } finally {
          this.loading = false;
        }

      }
    },
    computed: {
      id(): string {
        return this.qsrc!.id;
      },
      columns(): any[] {
        return [
          {name: 'revision', label: 'Revision', field: (row: QuoteSourceHistory) => 1 + (row.payload.lastUpdate?.revision??0)},
          {
            name: 'timestamp',
            label: 'Timestamp',
            field: (row: QuoteSourceHistory) => row.createTime.seconds*1000,
            format: (x: number) => new Date(x).toLocaleString()
          },
          {
            name: 'author',
            label: 'Author Id',
            field: (row: QuoteSourceHistory) => this.displayNameMap[row.uid] ?? row.uid
          },
        ];
      }
    },
    mounted() {
      this.refresh();

    }
  })
</script>

<style scoped>

</style>
