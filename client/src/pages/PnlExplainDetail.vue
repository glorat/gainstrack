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
          <command-date-editor label="From Date" :value="explainData.fromDate"
                               @input="fromDateChanged($event)"></command-date-editor>
        </td>
      </tr>
      <tr>
        <td class="datecell" colspan="2">
          <command-date-editor label="To Date" :value="explainData.toDate"
                               @input="toDateChanged($event)"></command-date-editor>
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

      Financial independence forecast: <span class="text-h4">{{ targetYear }}</span>

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

<script lang="ts">
import {mapGetters} from 'vuex';
import {apiPnlExplainDetail} from 'src/lib/apiFacade';
import {forecastFromPnl} from 'src/lib/forecastFromPnl';
import {
  defaultForecastModels,
  ForecastState,
  ForecastStateEx,
  ModelSpec,
  performForecast
} from 'src/lib/forecast/forecast';
import {PLExplainDTO} from 'src/lib/PLExplain';
import CommandDateEditor from 'components/CommandDateEditor.vue';
import {defineComponent} from 'vue';

export default defineComponent({
  name: 'PnlExplainDetail',
  props: ['fromDate', 'toDate'],
  components: {CommandDateEditor},
  computed: {
    ...mapGetters([
      'baseCcy',
      'allPostingsEx',
      'fxConverter',
      'allStateEx',
    ]),
    explainData(): PLExplainDTO {
      return this.explains[0];
    },
    deltas(): number[] {
      // Use of concat to sort a copy
      return this.explainData.delta.concat().sort((a, b) => Math.abs(b.explain) - Math.abs(a.explain));
    },
    forecastStrategy(): ModelSpec[] {
      return defaultForecastModels;
    },

    // Below fns are dupe from ForecastView. Mixin?
    forecastState(): ForecastState {
      return forecastFromPnl(this.explainData);
    },
    forecastEntries(): ForecastStateEx[] {
      let entries = performForecast(this.forecastState, this.forecastStrategy);
      return entries;
    },
    targetYear(): number {
      const e = this.forecastEntries;
      return e[e.length - 1].timeunit;
    },
  },
  methods: {
    amount: (value:number) => value.toFixed(2),
    fromDateChanged(ev:string) {
      this.$router.push({name: 'pnldetail', params: {fromDate: ev, toDate: this.explainData.toDate}});
    },
    toDateChanged(ev:string) {
      this.$router.push({name: 'pnldetail', params: {fromDate: this.explainData.fromDate, toDate: ev}});
    },
    async refresh(args?: any) {
      const notify = this.$notify;
      const params = args ?? this.$props;
      if (!params) debugger;
      try {
        const {fromDate, toDate} = params;
        if (!fromDate) debugger;
        this.explains = await apiPnlExplainDetail(this.$store, {fromDate, toDate});
      } catch (error) {
        const e:any = error;
        console.error(error);
        notify.error(e?.response || e.toString());
      }
    },
  },
  watch: {
    fxConverter() {
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  data() {
    const explains: PLExplainDTO[] = [];
    return {
      explains,
    };
  },
  beforeRouteUpdate(to, from, next): void {
    // react to route changes...
    // don't forget to call next()
    this.refresh(to.params);
    next();
  },
});
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
