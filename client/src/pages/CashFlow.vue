<template>
  <my-page padding>
    <h5>Cash Flow Statement</h5>

    <!-- Nothing tagged: say so, with the syntax. A zeroed statement would look like a real
         statement of a business with no cash flows, which is a much worse failure. -->
    <q-banner v-if="statement && !statement.declaredCashAccounts.length" class="bg-grey-3 q-mb-md">
      <div class="text-weight-medium">No accounts are marked as cash.</div>
      <div>
        A cash flow statement needs you to declare what counts as cash and cash equivalents.
        Tag the accounts in the editor:
      </div>
      <pre class="tagexample">2019-01-01 open Assets:Bank GBP
  cashEquivalent: true</pre>
      <div>
        Optionally classify where flows go with
        <code>cashflowClass: operating | investing | financing | adjustment</code> on the other
        side's account.
      </div>
    </q-banner>

    <table class="sortable" v-if="statement">
      <tbody>
      <tr>
        <td class="datecell" colspan="2">
          <command-date-editor label="From Date" :modelValue="statement.fromDate"
                               @update:modelValue="fromDateChanged($event)"></command-date-editor>
        </td>
      </tr>
      <tr>
        <td class="datecell" colspan="2">
          <command-date-editor label="To Date" :modelValue="statement.toDate"
                               @update:modelValue="toDateChanged($event)"></command-date-editor>
        </td>
      </tr>

      <tr>
        <td class="subtitle">Cash at start of period</td>
        <td class="num">{{ amount(statement.openingCash) }}</td>
      </tr>

      <template v-for="section in statement.sections" :key="section.cashflowClass">
        <tr><td></td><td></td></tr>
        <tr>
          <td class="subtitle">{{ label(section.cashflowClass) }}</td>
          <td class="num">{{ baseCcy }}</td>
        </tr>
        <tr v-for="line in section.byAccount" :key="line.account">
          <td>{{ line.account }}</td>
          <td class="num">{{ amount(line.value) }}</td>
        </tr>
        <tr v-if="!section.byAccount.length">
          <td class="text-grey">none</td>
          <td class="num">{{ amount(0) }}</td>
        </tr>
        <tr>
          <td class="subtotal">Net cash from {{ section.cashflowClass }} activities</td>
          <td class="subtotal num">{{ amount(section.total) }}</td>
        </tr>
      </template>

      <!-- Accounts the user tagged `cashflowClass: adjustment` — typically a suspense account a
           `bal` plugs to. Real cash moved, so it counts toward the net change, but it is held out
           of the activity subtotals where it could be mistaken for a measured figure. -->
      <template v-if="statement.adjustmentsByAccount.length">
        <tr><td></td><td></td></tr>
        <tr>
          <td class="subtitle">Adjustments (not classified as activities)</td>
          <td class="num">{{ baseCcy }}</td>
        </tr>
        <tr v-for="line in statement.adjustmentsByAccount" :key="line.account">
          <td>{{ line.account }}</td>
          <td class="num">{{ amount(line.value) }}</td>
        </tr>
        <tr>
          <td class="subtotal">Total adjustments</td>
          <td class="subtotal num">{{ amount(statement.adjustments) }}</td>
        </tr>
      </template>

      <tr v-if="statement.fxEffect !== 0">
        <td>Effect of exchange rate changes on cash held</td>
        <td class="num">{{ amount(statement.fxEffect) }}</td>
      </tr>

      <tr>
        <td class="subtotal">Net change in cash</td>
        <td class="subtotal num change">{{ amount(statement.closingCash - statement.openingCash) }}</td>
      </tr>
      <tr>
        <td class="total">Cash at end of period</td>
        <td class="total num">{{ amount(statement.closingCash) }}</td>
      </tr>
      </tbody>
    </table>

    <template v-if="statement && statement.diagnostics.length">
      <h6>Possible miscodings</h6>
      <p>
        These transactions are classified one way by the account's <code>cashflowClass</code> and
        another by the command that produced them. The account tag is what the statement above
        used, so these are worth a look rather than a problem with the figures.
      </p>
      <table class="sortable">
        <tbody>
        <tr>
          <td class="subtitle">Date</td>
          <td class="subtitle">Description</td>
          <td class="subtitle">Account</td>
          <td class="subtitle">By tag</td>
          <td class="subtitle">By command</td>
          <td class="subtitle num">{{ baseCcy }}</td>
        </tr>
        <tr v-for="(d, i) in statement.diagnostics" :key="i">
          <td>{{ d.date }}</td>
          <td>{{ d.description }}</td>
          <td>{{ d.account }}</td>
          <td>{{ d.tagClass }}</td>
          <td>{{ d.verbClass }}</td>
          <td class="num">{{ amount(d.value) }}</td>
        </tr>
        </tbody>
      </table>
    </template>

    <p v-if="statement && statement.declaredCashAccounts.length" class="text-grey q-mt-md">
      Cash and cash equivalents: {{ statement.declaredCashAccounts.join(', ') }}
    </p>
  </my-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { LocalDate } from '@js-joda/core';
import { useAppStore } from 'src/stores';
import { apiCashflowStatement } from 'src/lib/apiFacade';
import { CashflowStatement } from 'src/lib/cashflow';
import CommandDateEditor from 'components/CommandDateEditor.vue';
import { onBeforeRouteUpdate, useRouter } from 'vue-router';
import { qnotify } from 'src/boot/notify';

const props = defineProps<{ fromDate?: string; toDate?: string }>();

const store = useAppStore();
const router = useRouter();

const statement = ref<CashflowStatement | undefined>(undefined);
const baseCcy = computed(() => store.baseCcy);

/** Default period: the trailing year, matching how the P&L explain page is usually entered. */
function defaultDates() {
  const to = LocalDate.now();
  return { fromDate: to.minusYears(1).toString(), toDate: to.toString() };
}

const LABELS: Record<string, string> = {
  operating: 'Cash flows from operating activities',
  investing: 'Cash flows from investing activities',
  financing: 'Cash flows from financing activities',
};
function label(cls: string) { return LABELS[cls] ?? cls; }

function amount(value: number) { return value.toFixed(2); }

function fromDateChanged(ev: string) {
  router.push({ name: 'cashflow', params: { fromDate: ev, toDate: statement.value?.toDate } });
}

function toDateChanged(ev: string) {
  router.push({ name: 'cashflow', params: { fromDate: statement.value?.fromDate, toDate: ev } });
}

async function refresh(args?: { fromDate?: string; toDate?: string }) {
  const params = args ?? props;
  const defaults = defaultDates();
  try {
    statement.value = await apiCashflowStatement(store, {
      fromDate: params.fromDate ?? defaults.fromDate,
      toDate: params.toDate ?? defaults.toDate,
    });
  } catch (error) {
    console.error(error);
    qnotify.error(String(error));
  }
}

watch(() => store.fxConverter, () => refresh());

onMounted(() => { refresh(); });
onBeforeRouteUpdate((to, from, next) => { refresh(to.params as { fromDate?: string; toDate?: string }); next(); });
</script>

<style scoped>
.subtotal {
  border-top-color: black;
  border-top-width: 2px;
  border-top-style: solid;
}

.total {
  border-top-color: black;
  border-top-width: 2px;
  border-top-style: solid;

  border-bottom-color: black;
  border-bottom-width: medium;
  border-bottom-style: double;
}

.subtitle {
  font-weight: bold;
}

.change {
  color: maroon;
}

.tagexample {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.5em;
  margin: 0.5em 0;
}

/*Make empty tr rows take space*/
td:empty::after {
  content: "\00a0";
}
</style>
