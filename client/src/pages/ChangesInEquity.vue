<template>
  <my-page padding>
    <h5>Statement of Changes in Equity</h5>

    <table class="sortable" v-if="statement">
      <tbody>
      <tr>
        <td class="datecell" colspan="4">
          <command-date-editor label="From Date" :modelValue="fromDate"
                               @update:modelValue="fromDate = $event; refresh()"></command-date-editor>
        </td>
      </tr>
      <tr>
        <td class="datecell" colspan="4">
          <command-date-editor label="To Date" :modelValue="toDate"
                               @update:modelValue="toDate = $event; refresh()"></command-date-editor>
        </td>
      </tr>

      <tr>
        <td class="subtitle">Component</td>
        <td class="subtitle num">Opening</td>
        <td class="subtitle num">Movement</td>
        <td class="subtitle num">Closing</td>
      </tr>
      <tr v-for="row in statement.rows" :key="row.account">
        <td :title="row.account">{{ row.shortName }}</td>
        <td class="num">{{ amount(row.opening) }}</td>
        <td class="num change">{{ amount(row.movement) }}</td>
        <td class="num">{{ amount(row.closing) }}</td>
      </tr>
      <tr>
        <td class="total">Total equity</td>
        <td class="total num">{{ amount(statement.totalOpening) }}</td>
        <td class="total num">{{ amount(statement.totalMovement) }}</td>
        <td class="total num">{{ amount(statement.totalClosing) }}</td>
      </tr>
      </tbody>
    </table>

    <p class="text-grey q-mt-md">
      Amounts in {{ baseCcy }}. Each row is an equity account; the movement is its change over the
      period (a share issue on Share Capital, the result for the period on Retained Earnings).
    </p>
  </my-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { LocalDate } from '@js-joda/core';
import { useAppStore } from 'src/stores';
import { apiChangesInEquity } from 'src/lib/apiFacade';
import { ChangesInEquity } from 'src/lib/statements';
import CommandDateEditor from 'components/CommandDateEditor.vue';
import { qnotify } from 'src/boot/notify';

const store = useAppStore();

const statement = ref<ChangesInEquity | undefined>(undefined);
const baseCcy = computed(() => store.baseCcy);

const to = LocalDate.now();
const fromDate = ref(to.minusYears(1).toString());
const toDate = ref(to.toString());

function amount(value: number) { return value.toFixed(2); }

async function refresh() {
  try {
    statement.value = await apiChangesInEquity(store, { fromDate: fromDate.value, toDate: toDate.value });
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

.change {
  color: maroon;
}

td:empty::after {
  content: "\00a0";
}
</style>
