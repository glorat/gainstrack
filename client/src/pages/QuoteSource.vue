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
        <q-tab v-if="id" name="history" label="History"></q-tab>
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
  import {emptyQuoteSource, QuoteSource, quoteSourceDb, sanitiseQuoteSource, upsertQuoteSource} from 'src/lib/assetDb';
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
      const subscribeId: string|null = null;
      return {data, editingData, loading, tab, unsubscribe: null as null|(()=>void), subscribeId}
    },
    meta (): any {
      // Meta plug-in doesn't make type info available so this is a workaround
      const self = this as unknown as {data: QuoteSource|undefined};
      const data = self.data;
      const name = data?.name ?? 'AssetDB';
      const id = data?.id ?? 'Loading...';
      const title = `${name} | ${id}`;
      const description = `Key facts for ${name}`;

      return {
        title,
        description
      }
    },
    methods: {
      async refresh (props?: Record<string, any>) {
        const args = props ?? this.$props;
        const id = args.id;
        try {
          if (id !== this.subscribeId) {
            // Subscribing to something new

            // First clear existing subscription
            const existingSub = this.unsubscribe;
            if (existingSub !== null) {
              await existingSub()
            }

            // Subscribe to new thing
            this.subscribeId = id;
            if (id) {
              this.loading = true;
              this.unsubscribe = quoteSourceDb().where('id', '==', id).onSnapshot(items => {
                this.loading = false;
                const item = items.docs[0];
                const doc = item.data();
                this.data = sanitiseQuoteSource(doc);
                this.editingData = extend(true, {}, doc);
              });
            } else {
              // No id, new record
              const doc = emptyQuoteSource('');
              this.data = doc;
              this.editingData = extend(true, {}, doc);
              this.tab = 'edit';
              this.loading = false;
            }


          }
        } catch (error) {
          console.error(error)
          this.$notify.error(error)
        } finally {
          // this.loading = false;
        }
      },
      async saveQuoteSource() {
        try {
          this.loading = true;
          const editing = this.editingData;
          if (editing && editing.id) {
            await upsertQuoteSource(editing);
            this.$notify.success(`Save submitted for ${editing.id}. It will appear in a minute`);
            if (editing.id !== this.subscribeId) {
              // Probably added something new
              await this.$router.push('/assetdb');
            }
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
    beforeDestroy() {
      const unsub = this.unsubscribe;
      if (unsub) {
        unsub();
      }
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
