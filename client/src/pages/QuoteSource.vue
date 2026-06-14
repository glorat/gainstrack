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
      <q-tab-panels :modelValue="displayTab" animated>
        <q-tab-panel name="view">
          <quote-source-view :qsrc="data"></quote-source-view>
        </q-tab-panel>
        <q-tab-panel name="edit">
          <quote-source-editor v-if="editingData" v-model="editingData"></quote-source-editor>
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

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { emptyQuoteSource, QuoteSource, quoteSourceDb, sanitiseQuoteSource, upsertQuoteSource } from 'src/lib/assetdb/assetDb';
import { extend, useMeta } from 'quasar';
import { QuoteSourceEditor, QuoteSourceHistoryView, QuoteSourceView } from 'src/lib/assetdb';
import { query, where, onSnapshot } from 'firebase/firestore';
import { onBeforeRouteUpdate, useRouter } from 'vue-router';
import { qnotify } from 'src/boot/notify';

const props = defineProps<{ id?: string }>();

const router = useRouter();

const data = ref<QuoteSource | undefined>(undefined);
const editingData = ref<QuoteSource | undefined>(undefined);
const loading = ref(true);
const tab = ref('view');
const unsubscribe = ref<(() => void) | null>(null);
const subscribeId = ref<string | null>(null);

useMeta(() => {
  const name = data.value?.name ?? 'AssetDB';
  const id = data.value?.id ?? 'Loading...';
  return {
    title: `${name} | ${id}`,
    meta: {
      description: { name: 'description', content: `Key facts for ${name}` }
    }
  };
});

async function refresh(refreshProps?: Record<string, any>) {
  const args = refreshProps ?? props;
  const id = args.id;
  try {
    if (id !== subscribeId.value) {
      const existingSub = unsubscribe.value;
      if (existingSub !== null) {
        await existingSub();
      }

      subscribeId.value = id;
      if (id) {
        loading.value = true;
        const q = query(quoteSourceDb(), where('id', '==', id));
        unsubscribe.value = onSnapshot(q, items => {
          loading.value = false;
          const item = items.docs[0];
          const doc = item.data();
          data.value = sanitiseQuoteSource(doc);
          editingData.value = extend(true, {}, doc);
        });
      } else {
        const doc = emptyQuoteSource('');
        data.value = doc;
        editingData.value = extend(true, {}, doc);
        tab.value = 'edit';
        loading.value = false;
      }
    }
  } catch (error) {
    const e: any = error;
    console.error(error);
    qnotify.error(e.toString());
  }
}

async function saveQuoteSource() {
  try {
    loading.value = true;
    const editing = editingData.value;
    if (editing && editing.id) {
      await upsertQuoteSource(editing);
      qnotify.success(`Save submitted for ${editing.id}. It will appear in a minute`);
      if (editing.id !== subscribeId.value) {
        await router.push('/assetdb');
      }
    }
  } catch (error) {
    const e: any = error;
    console.error(error);
    qnotify.error(e?.message || e.toString());
  } finally {
    loading.value = false;
  }
}

const canSaveQuoteSource = computed((): boolean => !!editingData.value?.id);
const saveLabel = computed((): string => 'Save' + (canSaveQuoteSource.value ? ' ' + editingData.value!.id : ''));
const displayTab = computed((): string => tab.value);

onMounted(() => { refresh(); });
onBeforeUnmount(() => { unsubscribe.value?.(); });
onBeforeRouteUpdate((to, from, next) => { refresh(to.params as Record<string, any>); next(); });
</script>

<style scoped>

</style>
