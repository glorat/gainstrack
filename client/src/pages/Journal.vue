<template>
  <my-page padding>
    <h5>Journal</h5>
    <p>Shows all your transactions you have made. Change column shows the impact to your networth as at the time the
      transaction occurred</p>
    <journal-table :entries="info.rows" show-balance></journal-table>
  </my-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import JournalTable from '../components/JournalTable.vue';
import {AccountTxDTO, journalEntries} from 'src/lib/utils';
import {useAppStore} from 'src/stores';

defineProps<{ accountId?: string }>();

const store = useAppStore();

const info = ref<{ rows: AccountTxDTO[] }>({rows: []});

onMounted(() => {
  const fxConverter = store.fxConverter;
  const txs = store.allTxs.reverse();
  const cmds = store.allState.commands;
  const baseCcy = store.allState.baseCcy;
  info.value = {rows: journalEntries(fxConverter, txs, cmds, baseCcy)};
});
</script>

<style>

</style>
