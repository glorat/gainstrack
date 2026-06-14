<template>
  <my-page padding>
    <h5>P&L Explain</h5>
    <!--            Map("actual" -> actualPnl, "explained" -> explained, "unexplained" -> unexplained,-->
    <!--            "newActivityPnl" -> newActivityPnl,-->
    <!--            "totalEquity" -> totalEquity, "totalIncome" -> totalIncome, "totalExpense" -> totalExpense, "totalDeltaExplain" -> totalDeltaExplain-->
    <!--            // , "delta" -> deltaExplain-->
    <!--            )-->
    <table class="sortable" v-if="explains.length>0">
      <tbody>
      <tr>
        <td class="datecell" colspan="2">
          <command-date-editor label="From Date" :modelValue="explainData.fromDate"
                               @update:modelValue="fromDateChanged($event)"></command-date-editor>
        </td>
      </tr>
      <tr>
        <td class="datecell" colspan="2">
          <command-date-editor label="To Date" :modelValue="explainData.toDate"
                               @update:modelValue="toDateChanged($event)"></command-date-editor>
        </td>
      </tr>
      <tr>
        <td>Opening Networth</td>
        <td class="num">{{ amount(explainData.toNetworth - explainData.actual) }}</td>
      </tr>
      <tr>
        <td>Change In Networth</td>
        <td class="num change">{{ amount(explainData.actual) }}</td>
      </tr>
      <tr>
        <td class="total">Closing Networth</td>
        <td class="total num">{{ amount(explainData.toNetworth) }}</td>
      </tr>
      <tr>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td class="subtitle">Change In Networth</td>
        <td class="num">{{ baseCcy }}</td>
      </tr>
      <tr>
        <td>Markets Profit</td>
        <td class="num">{{ amount(explainData.totalDeltaExplain) }}</td>
      </tr>
      <tr>
        <td class="">Yield Income</td>
        <td class="num">{{ amount(explainData.totalYieldIncome) }}</td>
      </tr>
      <tr>
        <td class="">Income</td>
        <td class="num">{{ amount(explainData.totalIncome) }}</td>
      </tr>
      <tr>
        <td class="">Expenses</td>
        <td class="num">{{ amount(explainData.totalExpense) }}</td>
      </tr>
      <tr>
        <td class="">Equity</td>
        <td class="num">{{ amount(explainData.totalEquity) }}</td>
      </tr>
      <tr>
        <td class="">New Activity</td>
        <td class="num">{{ amount(explainData.newActivityPnl) }}</td>
      </tr>
      <tr>
        <td class="">Unexplained</td>
        <td class="num">{{ amount(explainData.unexplained) }}</td>
      </tr>
      <tr>
        <td class="total">Total</td>
        <td class="total num change">{{ amount(explainData.actual) }}</td>
      </tr>

      <tr>
        <td>Financial independence forecast:</td>
        <td><span class="text-h4">{{ targetYear }}</span></td>
      </tr>

      <tr v-if="deltas.length">
        <td></td>
        <td></td>
      </tr>
      <tr v-if="deltas.length">
        <td class="subtitle">Markets Profit</td>
        <td class="num">{{ baseCcy }}</td>
        <td class="num">{{ explainData.fromDate }}</td>
        <td class="num">{{ explainData.toDate }}</td>
        <td class="num">%</td>
        <td class="num">Units</td>
      </tr>
      <template v-if="deltas.length">
        <tr v-for="ccy in deltas">
          <td>{{ ccy.assetId }}</td>
          <td class="num">{{ ccy.explain.toFixed(2) }}</td>
          <td class="num">{{ ccy.oldPrice.toFixed(2) }}</td>
          <td class="num">{{ ccy.newPrice.toFixed(2) }}</td>
          <td class="num">{{ amount(100 * (ccy.newPrice - ccy.oldPrice) / ccy.oldPrice) }}%</td>
          <td class="num">{{ ccy.amount.toFixed(2) }}</td>
        </tr>
      </template>
      <tr v-if="deltas.length">
        <td class="subtotal">Total</td>
        <td class="num subtotal">{{ explainData.totalDeltaExplain.toFixed(2) }}</td>
      </tr>
      <tr v-if="explainData.newActivityByAccount.length">
        <td></td>
      </tr>
      <!--            <tr>-->
      <!--                <td class="subtitle">Income</td>-->
      <!--                <td class="num">{{ explainData.totalIncome.toFixed(2) }}</td>-->
      <!--            </tr>-->
      <!--            <tr>-->
      <!--                <td class="subtitle">Expenses</td>-->
      <!--                <td class="num">{{ explainData.totalExpense.toFixed(2) }}</td>-->
      <!--            </tr>-->
      <!--            <tr>-->
      <!--                <td class="subtitle">Equity</td>-->
      <!--                <td class="num">{{ explainData.totalEquity.toFixed(2) }}</td>-->
      <!--            </tr>-->
      <template v-if="explainData.expenseByAccount.length">
      <tr v-if="explainData.expenseByAccount.length">
          <td colspan="4" class="subtitle">Expenses</td>
          <td>P&L</td>
      </tr>
      <tr v-for="exp in explainData.expenseByAccount">
          <td colspan="4">{{ exp.accountId }}</td>
          <td class="num">{{ exp.value.toFixed(2) }}</td>
      </tr>
        <tr>
          <td class="subtotal" colspan="4">Total</td>
          <td class="subtotal num">{{ explainData.totalExpense.toFixed(2) }}</td>
        </tr>
        <tr><td></td><td></td></tr>
      </template>

      <tr v-if="explainData.newActivityByAccount.length">
        <td colspan="4" class="subtitle">New Activity</td>
        <td>P&L</td>
      </tr>
      <template v-if="explainData.newActivityByAccount.length">
        <tr v-for="exp in explainData.newActivityByAccount">
          <td colspan="4">{{ exp.accountId }}</td>
          <td class="num">{{ exp.explain.toFixed(2) }}</td>
        </tr>
      </template>
      <tr v-if="explainData.newActivityByAccount.length">
        <td class="subtotal" colspan="4">Total</td>
        <td class="subtotal num">{{ explainData.newActivityPnl.toFixed(2) }}</td>
      </tr>
      </tbody>
    </table>
  </my-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useAppStore } from 'src/stores';
import { apiPnlExplainDetail } from 'src/lib/apiFacade';
import { forecastFromPnl } from 'src/lib/forecastFromPnl';
import {
  defaultForecastModels,
  ForecastState,
  ForecastStateEx,
  performForecast
} from 'src/lib/forecast/forecast';
import { PLExplainDTO } from 'src/lib/PLExplain';
import CommandDateEditor from 'components/CommandDateEditor.vue';
import { onBeforeRouteUpdate, useRouter } from 'vue-router';
import { qnotify } from 'src/boot/notify';

const props = defineProps<{ fromDate?: string; toDate?: string }>();

const store = useAppStore();
const router = useRouter();

const explains = ref<PLExplainDTO[]>([]);
const expansions = ref<Record<string, boolean>>({});

const baseCcy = computed(() => store.baseCcy);

const explainData = computed((): PLExplainDTO => explains.value[0]);
const deltas = computed((): any[] =>
  explainData.value.delta.concat().sort((a, b) => Math.abs(b.explain) - Math.abs(a.explain))
);

const forecastStrategy = defaultForecastModels;
const forecastState = computed((): ForecastState => forecastFromPnl(explainData.value));
const forecastEntries = computed((): ForecastStateEx[] => performForecast(forecastState.value, forecastStrategy));
const targetYear = computed((): number | undefined => {
  const strategy = { inflation: 3, roi: 7, expenseMultiple: 25 };
  return forecastEntries.value.find(e => e.networth > e.expenses * strategy.expenseMultiple)?.timeunit;
});

function amount(value: number) { return value.toFixed(2); }

function fromDateChanged(ev: string) {
  router.push({ name: 'pnldetail', params: { fromDate: ev, toDate: explainData.value.toDate } });
}

function toDateChanged(ev: string) {
  router.push({ name: 'pnldetail', params: { fromDate: explainData.value.fromDate, toDate: ev } });
}

async function refresh(args?: any) {
  const params = args ?? props;
  try {
    const { fromDate, toDate } = params;
    explains.value = await apiPnlExplainDetail(store, { fromDate, toDate });
  } catch (error) {
    const e: any = error;
    console.error(error);
    qnotify.error(e?.response || e.toString());
  }
}

watch(() => store.fxConverter, () => refresh());

onMounted(() => { refresh(); });
onBeforeRouteUpdate((to, from, next) => { refresh(to.params); next(); });
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

/*Make empty tr rows take space*/
td:empty::after {
  content: "\00a0";
}
</style>
