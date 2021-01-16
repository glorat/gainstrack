<template>
  <my-page>
    <q-spinner
      v-if="loading"
      color="primary"
      size="3em"
    />
    <div v-else-if="data">
      <q-tabs v-model="tab" class="bg-secondary text-white">
        <q-tab name="view" label="View"></q-tab>
        <q-tab name="edit" label="Edit"></q-tab>
        <q-tab name="history" label="History"></q-tab>
      </q-tabs>
      <q-tab-panels :value="displayTab" animated>
        <q-tab-panel name="view">
          <quote-source-view :qsrc="data"></quote-source-view>
        </q-tab-panel>
        <q-tab-panel name="edit">
          <quote-source-editor :qsrc="editingData"></quote-source-editor>
          <q-btn @click="refresh()" label="Reset" color="warning"></q-btn>
          <q-btn :disable="!canSaveQuoteSource" @click="saveQuoteSource" :label="saveLabel" color="primary"></q-btn>
        </q-tab-panel>
        <q-tab-panel name="history">
          <quote-source-history-view :qsrc="editingData"></quote-source-history-view>
        </q-tab-panel>
      </q-tab-panels>

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
  import QuoteSourceHistoryView from 'components/QuoteSourceHistoryView.vue';
  import QuoteSourceView from 'components/QuoteSourceView.vue';

  export default Vue.extend({
    name: 'QuoteSource',
    components: {QuoteSourceEditor, QuoteSourceHistoryView, QuoteSourceView},
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
      const tab = 'view';
      return {data, editingData, loading, tab}
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
      },
      displayTab(): string {
        // Don't have a ready view tab yet
        // return this.tab==='view' ? 'edit' : this.tab;
        return this.tab;
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
