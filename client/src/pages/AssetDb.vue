<template>
  <my-page padding>
    <quote-source-filter @search="onSearch"></quote-source-filter>
    <quote-source-table :quote-sources="quoteSources" @row-click="quoteRowClick"></quote-source-table>

    <q-btn @click="createNew" label="Create New..." color="primary"></q-btn>
  </my-page>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {QuoteSource, getAllQuoteSources} from 'src/lib/assetDb';
  import QuoteSourceTable from 'components/QuoteSourceTable.vue';
  import QuoteSourceFilter from 'components/QuoteSourceFilter.vue';

  import firebase from 'firebase';
  import CollectionReference = firebase.firestore.CollectionReference;
  import Query = firebase.firestore.Query;

  // The code and logic is copy/pasted from the cloud functions section -
  // but somewhat necessarily since different types are in use in web client sdk vs admin sdk
  function applyQueries(col: CollectionReference, queries: any[]): Query|CollectionReference {
    let ret:Query|CollectionReference = col;

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
      const query:any = undefined;
      return {quoteSources, query};
    },

    methods: {
      async refresh() {
        try {
          if (this.query) {
            const filter = (col:CollectionReference) => applyQueries(col, this.query)
            this.quoteSources = await getAllQuoteSources(filter)
          } else {
            this.quoteSources = await getAllQuoteSources()
          }
        }
        catch (e) {
          this.$notify.error(e.message)
        }

      },
      onSearch(query:any) {
        this.query = query;
        this.refresh();
      },
      createNew() {
        this.$router.push({name: 'quoteSourceNew'});
        // this.$q.dialog({
        //   title: 'Create new quote source',
        //   message: 'What is the name of the observable?',
        //   prompt: {
        //     model: '',
        //     type: 'text' // optional
        //   },
        //   cancel: true,
        //   persistent: true
        // }).onOk(async (data:string) => {
        //   try {
        //     /*const newSrc = */ await createQuoteSource(data);
        //     this.refresh(); // Or could just manually append...
        //   }
        //   catch(e) {
        //     this.$notify.error(e);
        //   }
        //
        // })
      },
      quoteRowClick(qsrc: QuoteSource) {
        if (qsrc.id) {
          this.$router.push({name: 'quoteSource', params: {id: qsrc.id}});
        }
      }
    },
    mounted() {
      this.refresh();
    }
  })
</script>

<style scoped>

</style>
