<template>
  <my-page padding>
    <quote-source-filter :query="params.query" @search="onSearch"></quote-source-filter>
    <quote-source-table :quote-sources="quoteSources" @row-click="quoteRowClick"></quote-source-table>

    <q-btn color="primary" label="Create New..." @click="createNew"></q-btn>
  </my-page>
</template>

<script lang="ts">
import Vue from 'vue';
import {getAllQuoteSources, QuoteSource} from 'src/lib/assetDb';
import QuoteSourceTable from 'components/QuoteSourceTable.vue';
import QuoteSourceFilter from 'components/QuoteSourceFilter.vue';

import firebase from 'firebase';
import CollectionReference = firebase.firestore.CollectionReference;
import Query = firebase.firestore.Query;

function queryArgsToObj(args: string | (string | null)[]) {
  try {
    if (args && 'string'===typeof(args)) {
      const params = JSON.parse(args);
      return params;
    } else {
      return {};
    }
  } catch (e) {
    console.error(e);
    return {};
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
  })
  return ret;
}

export default Vue.extend({
  name: 'AssetDb',
  components: {QuoteSourceTable, QuoteSourceFilter},
  data() {
    const quoteSources = [] as QuoteSource[];
    const params: any = {};
    return {quoteSources, params};
  },

  methods: {
    async refresh(params: any) {
      this.params = params;
      const query = params.query;
      try {
        if (query && query.length && query[0].where) {
          const filter = (col: CollectionReference) => applyQueries(col, query)
          this.quoteSources = await getAllQuoteSources(filter)
        } else {
          this.quoteSources = await getAllQuoteSources()
        }
      } catch (e) {
        this.$notify.error(e.message)
      }

    },
    onSearch(query: any) {
      const args = {
        query,
        // TODO: fields, headers
      }
      this.$router.push({query: {args: JSON.stringify(args)}})
    },
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
