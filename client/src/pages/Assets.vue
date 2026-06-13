<template>
  <my-page padding>
    <asset-view :asset-response="assetResponse" :loading="loading"></asset-view>
  </my-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AssetView from '../components/AssetView.vue';
import axios from 'axios';
import {AssetResponse, PostingEx} from '../lib/assetdb/models';
import {LocalDate} from '@js-joda/core';
import {assetReport} from 'src/lib/assetReport';
import {isSubAccountOf, postingsToPositionSet} from 'src/lib/utils';
import {useAppStore} from 'src/stores';
import {qnotify} from 'src/boot/notify';

const store = useAppStore();

const assetResponse = ref<AssetResponse>({rows: [], columns: [], totals: []});
const loading = ref(true);

async function reloadAll(): Promise<void> {
  const localCompute = true;
  try {
    if (localCompute) {
      const allPostings: PostingEx[] = store.allPostingsEx;
      const pricer = store.fxConverter;
      const baseCcy = store.baseCcy;
      const date = LocalDate.now();
      const networthFilter = (p: PostingEx) => isSubAccountOf(p.account, 'Assets') || isSubAccountOf(p.account, 'Liabilities');
      const networthPs = allPostings.filter(networthFilter);
      const pSet = postingsToPositionSet(networthPs);
      assetResponse.value = assetReport(pSet, pricer, baseCcy, date);
    } else {
      const response = await axios.post('/api/assets/networth');
      assetResponse.value = response.data as AssetResponse;
    }
  } catch (error) {
    const e: any = error;
    console.error(error);
    qnotify.error(e.toString());
  } finally {
    loading.value = false;
  }
}

onMounted(() => { reloadAll(); });
</script>

<style scoped>

</style>
