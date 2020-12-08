<template>
  <my-page>
    <q-spinner
      v-if="loading"
      color="primary"
      size="3em"
    />
    <div v-else-if="data">
      <quote-source-editor :qsrc="editingData"></quote-source-editor>
    </div>
    <div v-else>
      Not found
    </div>
  </my-page>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {getQuoteSource, QuoteSource} from 'src/lib/assetDb';
  import QuoteSourceEditor from 'components/QuoteSourceEditor.vue';
  import { extend } from 'quasar'

  export default Vue.extend({
    name: 'QuoteSource',
    components: {QuoteSourceEditor},
    props: {
      id: String
    },
    data() {
      const data = undefined as QuoteSource|undefined;
      const editingData = undefined as QuoteSource|undefined;
      const loading = true;
      return {data, editingData, loading}
    },
    methods: {
      async refresh (props?: Record<string, any>) {
        const args = props ?? this.$props;
        const id = args.id;
        try {
          const doc = await getQuoteSource(id);
          this.editingData = extend(true, {}, doc);
          this.data = doc;
        } catch (error) {
          console.error(error)
          this.$notify.error(error)
        } finally {
          this.loading = false;
        }
      }
    },
    mounted(): void {
      this.refresh();
    },
    beforeRouteUpdate(to, from, next) {
      // react to route changes...
      // don't forget to call next()
      this.refresh(to.params)
      next()
    }
  })
</script>

<style scoped>

</style>
