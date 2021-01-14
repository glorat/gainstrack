<template>
  <div>
    <q-table :data="history" :columns="columns" :expanded.sync="expanded">
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
              <q-icon color="red" :name="mdiAlert" style="font-size: large"></q-icon> Under development
              <q-btn color="primary" disable label="Compare with current" ></q-btn>
              <q-btn color="primary" disable label="Changes"></q-btn>
              <q-btn color="warning" disable label="Revert To This"></q-btn>
            </div>
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {getQuoteSourceHistory, QuoteSource, QuoteSourceHistory} from 'src/lib/assetDb';
  import {mdiAlert} from '@quasar/extras/mdi-v5';

  export default Vue.extend({
    name: 'QuoteSourceHistoryView',
    props: {
      qsrc: Object as () => QuoteSource
    },
    data() {
      const expanded:string[] = [];
      const history:QuoteSourceHistory[] = [];
      const loading = false;
      return {
        mdiAlert,
        history,
        loading,
        expanded,
      }
    },
    methods: {
      async refresh() {
        this.loading = true;
        try {
          const history = await getQuoteSourceHistory(this.qsrc.id);
          this.history = history;
        } catch (e) {
          console.error(e)
        } finally {
          this.loading = false;
        }

      }
    },
    computed: {
      id(): string {
        return this.qsrc.id;
      },
      columns(): any[] {
        return [
          {name: 'revision', label: 'Revision', field: (row:QuoteSourceHistory) => row.payload.lastUpdate?.revision },
          {name: 'timestamp', label: 'Timestamp', field: (row:QuoteSourceHistory) => row.payload.lastUpdate?.timestamp, format: (x:number) => new Date(x).toLocaleString() },
          {name: 'author', label: 'Author Id', field: (row:QuoteSourceHistory) => row.uid },
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
