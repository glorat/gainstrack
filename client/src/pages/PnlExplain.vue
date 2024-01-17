<template>
    <my-page padding>
        <div class="block" v-if="explains.length>0">
            <h5>P&L Explanation</h5>
<!--            Map("actual" -> actualPnl, "explained" -> explained, "unexplained" -> unexplained,-->
<!--            "newActivityPnl" -> newActivityPnl,-->
<!--            "totalEquity" -> totalEquity, "totalIncome" -> totalIncome, "totalExpense" -> totalExpense, "totalDeltaExplain" -> totalDeltaExplain-->
<!--            // , "delta" -> deltaExplain-->
<!--            )-->
          <table class="sortable">
                <tbody>
                <tr>
                    <td></td>
                    <td class="description" v-for="explainData in explains">
                      <q-btn flat no-caps color="primary" padding="xs" class="full-width"
                             v-if="explainData.fromDate" :icon="matAnalytics" @click="onColumnClick(explainData)"
                      >{{ explainData.tenor }}</q-btn>
                    </td>
                </tr>
                <tr>
                    <td>From Date</td>
                    <td class="num" v-for="explainData in explains">{{ explainData.fromDate}}</td>
                </tr>
                <tr>
                    <td>To Date</td>
                    <td class="num" v-for="explainData in explains">{{ explainData.toDate}}</td>
                </tr>
                <tr>
                    <td>Opening Networth</td>
                    <td class="num" v-for="explainData in explains"><template v-if="explainData.toNetworth">{{ amount(explainData.toNetworth - explainData.actual) }}</template></td>
                </tr>
                <tr>
                    <td>Change In Networth</td>
                    <td class="num change" v-for="explainData in explains">{{ amount(explainData.actual) }}</td>
                </tr>
                <tr>
                    <td>(%)</td>
                    <td class="num" v-for="explainData in explains"><template v-if="explainData.networthChange">{{ perc(explainData.networthChange) }}</template></td>
                </tr>
                <tr>
                    <td class="total">Networth</td>
                    <td class="num total" v-for="explainData in explains"><template v-if="explainData.toNetworth">{{ explainData.toNetworth.toFixed(2) }}</template></td>
                </tr>
                <tr>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <td class="subtitle">Change In Networth</td>
                    <td></td>
                </tr>
                <tr>
                    <td>
                        <help-tip tag="marketsPnl"></help-tip>
                        Markets P&L
                    </td>
                    <td class="num" v-for="explainData in explains">{{ explainData.totalDeltaExplain.toFixed(2) }}</td>
                </tr>
<!--                <tr v-for="(ccy, ccyIndex) in explains[0].delta">-->
<!--                    <td>{{ ccy.assetId }}</td>-->
<!--                    <td class="num" v-for="explainData in explains">{{ explainData.delta[ccyIndex].explain.toFixed(2) }}</td>-->
<!--                </tr>-->
                <tr>
                    <td>Yield Income</td>
                    <td class="num" v-for="explainData in explains">{{ explainData.totalYieldIncome.toFixed(2) }}</td>
                </tr>
                <tr>
                    <td>Income</td>
                    <td class="num" v-for="explainData in explains">{{ explainData.totalIncome.toFixed(2) }}</td>
                </tr>
                <tr>
                    <td><q-btn round flat size="xs" :icon="expansions['expenses'] ? matRemoveCircleOutline : matAddCircleOutline" @click="expansions['expenses'] = !expansions['expenses']"></q-btn>
                      Expenses</td>
                    <td class="num" v-for="explainData in explains">{{ explainData.totalExpense.toFixed(2) }}</td>
                </tr>
                <template v-if="expansions['expenses']">
                  <tr v-for="(rec, recIdx) in explains[explains.length-1].expenseByAccount">
                    <td> - {{ rec.accountId}}</td>
                    <td class="num" v-for="explainData in explains">{{ explainData.expenseByAccount[recIdx]?.value?.toFixed(2) }}</td>
                  </tr>
                </template>
                <tr>
                    <td>Equity</td>
                    <td class="num" v-for="explainData in explains">{{ explainData.totalEquity.toFixed(2) }}</td>
                </tr>
                <tr>
                    <td>
                        <help-tip tag="newActivityPnl"></help-tip>
                        New Activity P&L
                    </td>
                    <td class="num" v-for="explainData in explains">{{ explainData.newActivityPnl.toFixed(2) }}</td>
                </tr>
                <tr>
                    <td>Unexplained P&L</td>
                    <td class="num" v-for="explainData in explains">{{ explainData.unexplained.toFixed(2) }}</td>
                </tr>
                <tr>
                    <td class="total">Total</td>
                    <td class="total num change" v-for="explainData in explains">{{ explainData.actual.toFixed(2) }}</td>
                </tr>

                </tbody>
            </table>
        </div>
        <span id="bottom"></span>
    </my-page>
</template>

<script setup lang="ts">
import {computed, onMounted, reactive, ref} from 'vue';
import HelpTip from '../components/HelpTip.vue';
import {apiPnlExplainMonthly} from '../lib/apiFacade';
import {matAddCircleOutline, matAnalytics, matRemoveCircleOutline} from '@quasar/extras/material-icons';
import {PLExplainDTO} from 'src/lib/PLExplain';
import {qnotify} from 'boot/notify'; 
import {useStore} from 'src/store';
import {router} from 'src/router';

const store = useStore();
const explains = ref<PLExplainDTO[]>([]);
const baseCcy = computed(() => store.getters.baseCcy);
const allPostingsEx = computed(() => store.getters.allPostingsEx);
const fxConverter = computed(() => store.getters.fxConverter);
const expansions = reactive<Record<string, boolean>>({})

const refresh = async () => {
  const notify = qnotify;
  try {
    explains.value = await apiPnlExplainMonthly(store);
  } catch (error: any) {
    console.error(error);
    notify.error(error);
  }
};

const onColumnClick = (explain: PLExplainDTO) => {
  if (explain.fromDate && explain.toDate) {
    router.push({ name: 'pnldetail', params: { fromDate: explain.fromDate, toDate: explain.toDate } });
  }
};

const percChange = (explainData: PLExplainDTO) => {
  const denom = explainData.toNetworth ? explainData.toNetworth - explainData.actual : 0.0;
  return denom === 0.0 ? 0.0 : explainData.actual / denom;
};

const amount = (value: number) => value.toFixed(2);
const perc = (value: number) => (100 * value).toFixed(1) + '%';

onMounted(refresh);
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
    td:empty::after{
        content: "\00a0";
    }
</style>
