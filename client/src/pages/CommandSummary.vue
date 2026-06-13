<template>
  <my-page padding>
    <q-tabs v-model="accountId" inline-label class="bg-secondary text-white" no-caps>
      <q-tab name="Assets" label="Assets"></q-tab>
      <q-tab name="Liabilities"  label="Liabilities"></q-tab>
      <q-tab name="Income"  label="Income"></q-tab>
      <q-tab name="Expenses"  label="Expenses"></q-tab>
      <q-tab name="Equity"  label="Equity"></q-tab>
    </q-tabs>

    <networth-sunburst :height="200" :account-id="accountId"></networth-sunburst>
    <q-table dense :rows="data" :columns="columns" :pagination="pagination" @row-click="onRowClick">
      <template v-slot:bottom-row>
        <q-tr>
          <q-td>
            Total:
          </q-td>
          <q-td class="num">
            {{ totalValueStr }}
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </my-page>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import {apiAccountSummary} from 'src/lib/apiFacade';
import {useAppStore} from 'src/stores';
import {sum} from 'lodash';
import {formatNumber} from 'src/lib/utils';
import NetworthSunburst from 'components/NetworthSunburst.vue';
import {useRouter} from 'vue-router';

const store = useAppStore();
const router = useRouter();

const columns = ref<any[]>([]);
const data = ref<Record<string, any>[]>([]);
const pagination = ref({rowsPerPage: 30, sortBy: 'accountId', descending: false});
const accountId = ref('Assets');

async function refresh() {
  const result = await apiAccountSummary(store, {accountId: accountId.value});
  columns.value = result.columns;
  data.value = result.data;
}

function onRowClick(ev: any, row: Record<string, any>): void {
  router.push({name: 'account', params: {accountId: row.accountId}}).catch(() => {});
}

watch(accountId, () => { refresh(); });

const totalValue = computed((): number => sum(data.value.map(row => row.balance)));
const totalValueStr = computed((): string => formatNumber(totalValue.value));

onMounted(() => { refresh(); });
</script>

<style scoped>

</style>
