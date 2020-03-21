<template>
    <my-page padding v-if="explains.length>0">
        <h5>P&L Explain</h5>
        <!--            Map("actual" -> actualPnl, "explained" -> explained, "unexplained" -> unexplained,-->
        <!--            "newActivityPnl" -> newActivityPnl,-->
        <!--            "totalEquity" -> totalEquity, "totalIncome" -> totalIncome, "totalExpense" -> totalExpense, "totalDeltaExplain" -> totalDeltaExplain-->
        <!--            // , "delta" -> deltaExplain-->
        <!--            )-->
        <table class="sortable">
            <tbody>
            <tr>
                <td>From Date</td>
                <td class="datecell">
                    <el-datepicker :value="explainData.fromDate"
                                   @input="fromDateChanged($event)"
                                   type="date"
                                   value-format="yyyy-MM-dd"
                                   size="small"
                                   :clearable="false">
                    </el-datepicker>
                </td>
            </tr>
            <tr>
                <td>To Date</td>
                <td class="datecell">
                    <el-datepicker :value="explainData.toDate"
                                   @input="toDateChanged($event)"
                                   type="date"
                                   value-format="yyyy-MM-dd"
                                   size="small"
                                   :clearable="false">
                    </el-datepicker>
                </td>
            </tr>
            <tr>
                <td>Opening Networth</td>
                <td class="num">{{ explainData.toNetworth - explainData.actual | amount }}</td>
            </tr>
            <tr>
                <td>Change In Networth</td>
                <td class="num change">{{ explainData.actual | amount}}</td>
            </tr>
            <tr>
                <td class="total">Closing Networth</td>
                <td class="total num">{{ explainData.toNetworth | amount }}</td>
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
                <td class="num">{{ explainData.totalDeltaExplain | amount }}</td>
            </tr>
            <tr>
                <td class="">Yield Income</td>
                <td class="num">{{ explainData.totalYieldIncome | amount }}</td>
            </tr>
            <tr>
                <td class="">Income</td>
                <td class="num">{{ explainData.totalIncome | amount }}</td>
            </tr>
            <tr>
                <td class="">Expenses</td>
                <td class="num">{{ explainData.totalExpense | amount }}</td>
            </tr>
            <tr>
                <td class="">Equity</td>
                <td class="num">{{ explainData.totalEquity | amount }}</td>
            </tr>
            <tr>
                <td class="">New Activity</td>
                <td class="num">{{ explainData.newActivityPnl | amount }}</td>
            </tr>
            <tr>
                <td class="">Unexplained</td>
                <td class="num">{{ explainData.unexplained | amount }}</td>
            </tr>
            <tr>
                <td class="total">Total</td>
                <td class="total num change">{{ explainData.actual | amount }}</td>
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
                    <td class="num">{{ ccy.oldPrice.toFixed(2)}}</td>
                    <td class="num">{{ ccy.newPrice.toFixed(2)}}</td>
                    <td class="num">{{ 100*(ccy.newPrice-ccy.oldPrice)/ccy.oldPrice | amount }}%</td>
                    <td class="num">{{ ccy.amount.toFixed(2)}}</td>
                </tr>
            </template>
            <tr v-if="deltas.length">
                <td class="subtotal">Total</td>
                <td class="num subtotal">{{ explainData.totalDeltaExplain.toFixed(2) }}</td>
            </tr>
            <tr v-if="explainData.newActivityByAccount.length"><td></td></tr>
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

<script>
    import axios from 'axios';
    import {DatePicker} from 'element-ui';
    import {mapGetters} from 'vuex';

    export default {
        name: 'PnlExplainDetail',
        props: ['fromDate', 'toDate'],
        components: {'el-datepicker': DatePicker},
        computed: {
            ...mapGetters([
                'baseCcy',
            ]),
            explainData() {
                return this.explains[0]
            },
            deltas() {
                // Use of concat to sort a copy
                return this.explainData.delta.concat().sort((a, b) => Math.abs(b.explain) - Math.abs(a.explain));
            },
        },
        filters: {
            amount: (value) => value.toFixed(2)
        },
        methods: {
            fromDateChanged(ev) {
                this.$router.push({name: 'pnldetail', params: {fromDate: ev, toDate: this.explainData.toDate}});
            },
            toDateChanged(ev) {
                this.$router.push({name: 'pnldetail', params: {fromDate: this.explainData.fromDate, toDate: ev}});
            },
            refresh(args) {
                const notify = this.$notify;
                axios.post('/api/pnlexplain', args)
                    .then(response => {
                        this.explains = response.data;
                    })
                    .catch(error => notify.error(error.response));
            },
        },
        mounted() {
            const args = {
                fromDate: this.fromDate,
                toDate: this.toDate
            };
            this.refresh(args);
        },
        data() {
            return {
                explains: [],
            }
        },
        beforeRouteUpdate(to, from, next) {
            // react to route changes...
            // don't forget to call next()
            this.refresh(to.params);
            next();
        },
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
