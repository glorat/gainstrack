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

<script lang="ts">
import {defineComponent} from 'vue';
import {getAllQuoteSources, QuoteSource} from 'src/lib/assetdb/assetDb';
// import QuoteSourceTable from 'src/lib/assetdb/components/QuoteSourceTable.vue';
// import QuoteSourceFilter from 'src/lib/assetdb/components/QuoteSourceFilter.vue';

import {debounce} from 'quasar';
import {quoteSourceFieldProperties} from 'src/lib/assetdb/AssetSchema';
import {applyQueries, searchObjToQuery} from 'src/lib/assetdb/schema';
import {QuoteSourceFilter, QuoteSourceTable} from 'src/lib/assetdb';

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

export default defineComponent({
  name: 'AssetDb',
  components: {QuoteSourceTable, QuoteSourceFilter},
  data() {
    const quoteSources = [] as QuoteSource[];
    const params: any = defaultParams();
    const previewQuery: any = undefined;
    const loading = false;
    const selectedColumns = undefined;
    const columnEditing = false;
    const previewing = false;
    return {quoteSources, params, loading, selectedColumns, columnEditing, previewQuery, previewing};
  },

  methods: {
    async refresh() {
      const queryArgs = this.$route.query['args'];
      const params = queryArgsToObj(queryArgs) ?? defaultParams();

      // Perform some sanitising/defaulting
      if (!params.query) params.query = [];
      if (!params.searchObj) params.searchObj = {asset:{}};
      if (!params.fields) params.fields = [];

      this.params = params;

      if (params?.fields && params.fields.length > 0) {
        this.selectedColumns = params.fields;
      }
      this.previewing = false;
      await this.applyQuery(params);

    },
    async applyQuery(params: any) {
      const defaultLimit = 20;
      const actualLimit = defaultLimit;

      try {
        this.loading = true;
        const {query, searchObj} = params ?? {};
        const advancedQuery = query ?? [];
        const searchObjQuery = searchObjToQuery(searchObj ?? {}, quoteSourceFieldProperties);
        const cq = [...advancedQuery, ...searchObjQuery];

        if (cq && cq.length && cq[0].where) {
          const filter = (col: any) => applyQueries(col, cq).limit(actualLimit);
          this.quoteSources = await getAllQuoteSources(filter)
        } else {
          this.quoteSources = await getAllQuoteSources((col:any) => col.limit(actualLimit));
        }
      } catch (error) {
        const e:any = error;
        this.$notify.error(e.message ?? e.toString());
      } finally {
        this.loading = false;
      }
    },
    onSearch(params: any) {
      const args = JSON.stringify(params);
      // Prevent NavigationDuplicated
      if (this.$route.query?.args !== args) {
        this.$router.push({query: {args}})
      }
    },
    onPreview(params: any) {
      this.previewQuery = params;
      this.doPreview();
    },
    doPreview: debounce(async function(this:any) {
      this.onSearch(this.previewQuery);
      // await this.applyQuery(this.previewQuery, 10);
      // this.previewing = true;
    },1000),
    createNew() {
      this.$router.push({name: 'quoteSourceNew'});
    },
    quoteRowClick(qsrc: QuoteSource) {
      if (qsrc.id) {
        this.$router.push({name: 'quoteSource', params: {id: qsrc.id}});
      }
    }
  },
  computed: {
  },
  watch: {
    params: {
      handler(val) {
        this.onPreview(val)
      }, deep: true
    },
    '$route': 'refresh'
  },
  mounted() {
    this.refresh();
  },
})


</script>

<style scoped>

</style>
