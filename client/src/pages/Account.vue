<template>
  <my-page padding>
    <q-tabs v-model="tab" inline-label class="bg-secondary text-white">
      <q-tab name="assets" :icon="matAssignment" label="Balance"></q-tab>
      <q-tab name="statement" :icon="matAccountBalance" label="Statements"></q-tab>
      <q-tab name="journal" :icon="matEdit" label="Journal" v-if="hasJournal" class="account-tab-journal"></q-tab>
    </q-tabs>

    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="statement">
        <h6><a href="/gainstrack/command/get/">{{ accountId }}</a></h6>
        <div>
          <account-graph :accountId="accountId"></account-graph>
        </div>
        <div>
          <conversion-select></conversion-select>
        </div>

        <journal-table :entries="displayEntries" show-balance></journal-table>
      </q-tab-panel>

      <q-tab-panel name="journal">
        <account-journal :accountId="accountId"></account-journal>
      </q-tab-panel>

      <q-tab-panel name="assets">
        <asset-view :assetResponse="assetResponse" :loading="false" :account-id="accountId"></asset-view>
      </q-tab-panel>


    </q-tab-panels>


  </my-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import JournalTable from '../components/JournalTable.vue';
import ConversionSelect from '../components/ConversionSelect.vue';
import AccountGraph from '../components/AccountGraph.vue';
import AccountJournal from '../components/AccountJournal.vue';
import AssetView from '../components/AssetView.vue';
import { matAccountBalance, matAssignment, matEdit } from '@quasar/extras/material-icons';
import { useAppStore } from 'src/stores';
import {
  commandPostingsWithBalance,
  CommandPostingsWithBalance,
  displayConvertedPositionSet,
  isSubAccountOf,
  postingsByCommand
} from 'src/lib/utils';
import { AccountDTO, NetworthByAsset, Posting } from 'src/lib/assetdb/models';
import { LocalDate } from '@js-joda/core';
import { apiAssetsReport } from 'src/lib/apiFacade';
import { onBeforeRouteUpdate } from 'vue-router';
import { qnotify } from 'src/boot/notify';

const props = defineProps<{ accountId: string }>();

const store = useAppStore();

const assetResponse = ref<{ rows: NetworthByAsset[]; columns: Record<string, any>[]; totals: NetworthByAsset[] }>({
  rows: [],
  columns: [],
  totals: [],
});
const tab = ref('assets');

const myAccount = computed((): AccountDTO | undefined => store.findAccount(props.accountId));
const hasJournal = computed((): boolean => store.mainAccounts.includes(props.accountId));

const entries = computed((): CommandPostingsWithBalance[] => {
  const res = postingsByCommand(store.allTxs, store.allState.commands, (p: Posting) => isSubAccountOf(p.account, props.accountId));
  return commandPostingsWithBalance(res);
});

const displayEntries = computed(() =>
  [...entries.value].reverse().map(cp => {
    const date = LocalDate.parse(cp.cmd.date); // FIXME: tx dates may differ from cmd date!
    return {
      date: cp.cmd.date,
      cmdType: cp.cmd.commandType ?? '',
      description: cp.cmd.description ?? '',
      change: displayConvertedPositionSet(cp.delta, store.baseCcy, store.conversion, date, myAccount.value, store.tradeFxConverter),
      position: displayConvertedPositionSet(cp.balance, store.baseCcy, store.conversion, date, myAccount.value, store.tradeFxConverter),
      postings: cp.postings,
    };
  })
);

async function refresh(refreshProps?: Record<string, any>) {
  try {
    assetResponse.value = await apiAssetsReport(store, refreshProps ?? props);
  } catch (error) {
    const e: any = error;
    console.error(error);
    qnotify.error(e.toString());
  }
}

watch(() => store.conversion, () => refresh());
watch(() => store.reloadCounter, () => refresh());
watch(() => store.fxConverter, () => refresh());

onMounted(() => { refresh(); });
onBeforeRouteUpdate((to, from, next) => { refresh(to.params as Record<string, any>); next(); });
</script>

<style scoped>

</style>
