<template>
  <my-page>
    <q-spinner
      v-if="loading"
      color="primary"
      size="3em"
    />
    <div v-if="data">
      <quote-source-editor :qsrc="editingData"></quote-source-editor>
      <q-btn :disable="!canSaveQuoteSource" @click="saveQuoteSource" :label="saveLabel" color="primary"></q-btn>
    </div>
    <div v-else>
      Not found
    </div>
  </my-page>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {emptyQuoteSource, getQuoteSource, QuoteSource, upsertQuoteSource} from 'src/lib/assetDb';
  import QuoteSourceEditor from 'components/QuoteSourceEditor.vue';
  import { extend } from 'quasar'

  export default Vue.extend({
    name: 'QuoteSource',
    components: {QuoteSourceEditor},
    props: {
      id: {
        type: String,
        required: false,
      }
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
          let doc;
          if (id) {
            doc = await getQuoteSource(id);
          } else {
            doc = emptyQuoteSource('')
          }
          this.editingData = extend(true, {}, doc);
          this.data = doc;
        } catch (error) {
          console.error(error)
          this.$notify.error(error)
        } finally {
          this.loading = false;
        }
      },
      async saveQuoteSource() {
        try {
          this.loading = true;
          if (this.editingData && this.editingData.id) {
            await upsertQuoteSource(this.editingData);
          }
        }
        catch (error) {
          console.error(error);
          this.$notify.error(error.message);
        }
        finally {
          this.loading = false
        }
      }
    },
    computed: {
      canSaveQuoteSource(): boolean {
        return !!this.editingData && !!this.editingData.id;
      },
      saveLabel(): string {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        return 'Save' + (this.canSaveQuoteSource ? ' ' + this.editingData!.id : '');
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
