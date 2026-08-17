<template>
  <my-page padding>
    <h5>Trial Balance</h5>

    <table class="sortable" v-if="statement">
      <tbody>
      <tr>
        <td class="datecell" colspan="3">
          <command-date-editor label="As at" :modelValue="asOf"
                               @update:modelValue="asOf = $event; refresh()"></command-date-editor>
        </td>
      </tr>

      <tr>
        <td class="subtitle">Account</td>
        <td class="subtitle num">Debit</td>
        <td class="subtitle num">Credit</td>
      </tr>
      <tr v-for="row in statement.rows" :key="row.account">
        <td :title="row.account">{{ row.account }}</td>
        <td class="num">{{ show(row.debit) }}</td>
        <td class="num">{{ show(row.credit) }}</td>
      </tr>
      <tr>
        <td class="total">Total ({{ baseCcy }})</td>
        <td class="total num">{{ amount(statement.totalDebit) }}</td>
        <td class="total num">{{ amount(statement.totalCredit) }}</td>
      </tr>
      </tbody>
    </table>

    <!-- The whole point of a trial balance: debits must equal credits. A non-zero imbalance means a
         posting leg was dropped, so surface it loudly rather than let it pass as a rounding wobble. -->
    <q-banner v-if="statement && statement.imbalance !== 0" class="bg-red-2 q-mt-md">
      Out of balance by {{ amount(statement.imbalance) }} {{ baseCcy }} — debits do not equal credits.
    </q-banner>
    <p v-else-if="statement" class="text-grey q-mt-md">
      In balance: debits equal credits. Pre-closing basis — income and expense accounts still show,
      and retained earnings sits at its opening balance.
    </p>
  </my-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { LocalDate } from '@js-joda/core';
import { useAppStore } from 'src/stores';
import { apiTrialBalance } from 'src/lib/apiFacade';
import { TrialBalance } from 'src/lib/statements';
import CommandDateEditor from 'components/CommandDateEditor.vue';
import { qnotify } from 'src/boot/notify';

const store = useAppStore();

const statement = ref<TrialBalance | undefined>(undefined);
const baseCcy = computed(() => store.baseCcy);

const asOf = ref(LocalDate.now().toString());

function amount(value: number) { return value.toFixed(2); }
function show(value: number) { return value ? value.toFixed(2) : ''; }

async function refresh() {
  try {
    statement.value = await apiTrialBalance(store, { asOf: asOf.value });
  } catch (error) {
    console.error(error);
    qnotify.error(String(error));
  }
}

watch(() => store.fxConverter, () => refresh());
onMounted(() => { refresh(); });
</script>

<style scoped>
.total {
  border-top: 2px solid black;
  border-bottom: medium double black;
}

.subtitle {
  font-weight: bold;
}

td:empty::after {
  content: "\00a0";
}
</style>
