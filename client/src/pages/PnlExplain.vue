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
                    <td>Expenses</td>
                    <td class="num" v-for="explainData in explains">{{ explainData.totalExpense.toFixed(2) }}</td>
                </tr>
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

<script>
    import HelpTip from '../components/HelpTip';
    import { mapGetters } from 'vuex';
    import { apiPnlExplainMonthly } from '../lib/apiFacade';
    import { matAnalytics } from '@quasar/extras/material-icons'


    export default {
        name: 'PnlExplain',
        components: {
            HelpTip,
        },
        computed: {
          ...mapGetters([
            'baseCcy',
            'allPostingsEx',
            'fxConverter',
          ]),
        },
        mounted() {
            this.refresh()
        },
        methods: {
          async refresh() {
            const notify = this.$notify;
            try {
              this.explains = await apiPnlExplainMonthly(this.$store);
            } catch (error) {
              console.error(error);
              notify.error(error);
            }
          },
            onColumnClick(explain) {
                if (explain.fromDate && explain.toDate) {
                    this.$router.push({name: 'pnldetail', params: {fromDate: explain.fromDate, toDate: explain.toDate}});
                }
            },
            percChange(explainData) {
                const denom = explainData.toNetworth ? explainData.toNetworth - explainData.actual : 0.0;
                return (denom === 0.0) ? 0.0 : explainData.actual / denom;
            },
          amount: (value) => value.toFixed(2),
          perc: (value) => (100*value).toFixed(1) + '%',
        },
        data() {
          // eslint-disable-next-line
            const self = this;
            return {
                explains: [],
              matAnalytics,
            };

        }
    }
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
