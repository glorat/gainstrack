<template>
  <my-page padding>
    <quote-source-filter :params="params"
                         :selected-columns="selectedColumns" @update:selected-columns="selectedColumns = $event"
                         :column-editing="columnEditing" @update:column-editing="columnEditing = $event"
                         @preview="onPreview"
                         @search="onSearch" ></quote-source-filter>
    <quote-source-table :quote-sources="quoteSources"
                        :selected-columns="selectedColumns" @update:selected-columns="selectedColumns = $event"
                        :column-editing="columnEditing"
                        :loading="loading"
                        @row-click="quoteRowClick" >
    </quote-source-table>

    <q-btn color="primary" label="Create New..." @click="createNew"></q-btn>
  </my-page>
</template>

<script lang="ts">
import Vue from 'vue';
import {getAllQuoteSources, QuoteSource} from 'src/lib/assetDb';
import QuoteSourceTable from 'components/QuoteSourceTable.vue';
import QuoteSourceFilter from 'components/QuoteSourceFilter.vue';

import firebase from 'firebase/app';
import CollectionReference = firebase.firestore.CollectionReference;
import Query = firebase.firestore.Query;
import {debounce} from 'quasar';
import { searchObjToQuery } from 'src/lib/AssetSchema';

function queryArgsToObj(args: string | (string | null)[]) {
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

// The code and logic is copy/pasted from the cloud functions section -
// but somewhat necessarily since different types are in use in web client sdk vs admin sdk
function applyQueries(col: CollectionReference, queries: any[]): Query | CollectionReference {
  let ret: Query | CollectionReference = col;

  queries.forEach(qry => {
    if (qry.where) {
      const where = qry.where;
      if (where.length === 3) {
        ret = ret.where(where[0], where[1], where[2])
      }
    } else if (qry.orderBy) {
      const orderBy = qry.orderBy;
      ret = ret.orderBy(orderBy[0], orderBy[1])
    }
  });
  return ret;
}

export default Vue.extend({
  name: 'AssetDb',
  components: {QuoteSourceTable, QuoteSourceFilter},
  data() {
    const quoteSources = [] as QuoteSource[];
    const params: any = undefined;
    const previewQuery: any = undefined;
    const loading = false;
    const selectedColumns = undefined;
    const columnEditing = false;
    return {quoteSources, params, loading, selectedColumns, columnEditing, previewQuery};
  },

  methods: {
    async refresh(params: any) {
      this.params = params;

      if (params?.fields && params.fields.length > 0) {
        this.selectedColumns = params.fields;
      }
      await this.applyQuery(params);

    },
    async applyQuery(params: any, limit?: number) {
      try {
        this.loading = true;
        const {query, searchObj} = params ?? {};
        const advancedQuery = query ?? [];
        const searchObjQuery = searchObjToQuery(searchObj ?? {});
        const cq = [...advancedQuery, ...searchObjQuery];

        if (cq && cq.length && cq[0].where) {
          const filter = limit ? (col: CollectionReference) => applyQueries(col, cq).limit(limit) : (col: CollectionReference) => applyQueries(col, cq)
          this.quoteSources = await getAllQuoteSources(filter)
        } else {
          this.quoteSources = await getAllQuoteSources()
        }
      } catch (e) {
        this.$notify.error(e.message)
      } finally {
        this.loading = false;
      }
    },
    onSearch(params: any) {
      this.$router.push({query: {args: JSON.stringify(params)}})
    },
    onPreview(params: any) {
      this.previewQuery = params;
      this.doPreview();
    },
    doPreview: debounce(async function(this:any) {
      await this.applyQuery(this.previewQuery, 10);
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
  mounted() {
    const params = queryArgsToObj(this.$route.query.args)
    this.refresh(params);

  },
  beforeRouteUpdate(to, from, next) {
    // react to route changes...
    // don't forget to call next()
    const params = queryArgsToObj(to.query.args);
    this.refresh(params);
    next();
  },
})


</script>

<style scoped>

</style>
