<template>
  <my-page padding>
    <quote-source-table :quote-sources="quoteSources" @row-click="quoteRowClick"></quote-source-table>

    <q-btn @click="createNew" label="Create New..." color="primary"></q-btn>
  </my-page>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {QuoteSource, getAllQuoteSources, createQuoteSource} from 'src/lib/assetDb';
  import QuoteSourceTable from 'components/QuoteSourceTable.vue';

  export default Vue.extend({
    name: 'AssetDb',
    components: {QuoteSourceTable},
    data() {
      const quoteSources = [] as QuoteSource[];
      return {quoteSources};
    },

    methods: {
      async refresh() {
        // TODO：Hold this in vuex so we don't hit the DB on every page view?
        this.quoteSources = await getAllQuoteSources()
      },
      createNew() {
        this.$q.dialog({
          title: 'Create new quote source',
          message: 'What is the name of the observable?',
          prompt: {
            model: '',
            type: 'text' // optional
          },
          cancel: true,
          persistent: true
        }).onOk(async (data:string) => {
          try {
            /*const newSrc = */ await createQuoteSource(data);
            this.refresh(); // Or could just manually append...
          }
          catch(e) {
            this.$notify.error(e);
          }

        })
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
