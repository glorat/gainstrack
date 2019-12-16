<template>
    <div class="block" v-if="explains.length>0">
        P&L Explanation
        <!--            Map("actual" -> actualPnl, "explained" -> explained, "unexplained" -> unexplained,-->
        <!--            "newActivityPnl" -> newActivityPnl,-->
        <!--            "totalEquity" -> totalEquity, "totalIncome" -> totalIncome, "totalExpense" -> totalExpense, "totalDeltaExplain" -> totalDeltaExplain-->
        <!--            // , "delta" -> deltaExplain-->
        <!--            )-->
        <table class="sortable">
            <tbody>
            <tr>
                <td>Tenor</td>
                <td class="description">{{ explainData.tenor}}</td>
            </tr>
            <tr>
                <td>From Date</td>
                <td class="datecell">{{ explainData.fromDate}}</td>
            </tr>
            <tr>
                <td>To Date</td>
                <td class="datecell">{{ explainData.toDate}}</td>
            </tr>
            <tr>
                <td>Markets Profit</td>
                <td class="num">{{ explainData.totalDeltaExplain.toFixed(2) }}</td>
            </tr>
            <tr v-for="(ccy, ccyIndex) in explainData.delta">
                <td>{{ ccy.assetId }}</td>
                <td class="num">{{ ccy.explain.toFixed(2) }}</td>
                <td class="num">{{ ccy.oldPrice.toFixed(2)}}</td>
                <td class="num">{{ ccy.newPrice.toFixed(2)}}</td>
            </tr>
            <tr>
                <td>Income</td>
                <td class="num">{{ explainData.totalIncome.toFixed(2) }}</td>
            </tr>
            <tr>
                <td>Expenses</td>
                <td class="num">{{ explainData.totalExpense.toFixed(2) }}</td>
            </tr>
            <tr>
                <td>Equity</td>
                <td class="num">{{ explainData.totalEquity.toFixed(2) }}</td>
            </tr>
            <tr>
                <td>New Activity Profit</td>
                <td class="num">{{ explainData.newActivityPnl.toFixed(2) }}</td>
            </tr>
            <tr>
                <td>Explained P&L</td>
                <td class="num">{{ explainData.explained.toFixed(2) }}</td>
            </tr>
            <tr>
                <td>Actual P&L</td>
                <td class="num">{{ explainData.actual.toFixed(2) }}</td>
            </tr>
            <tr>
                <td>Unexplained P&L</td>
                <td class="num">{{ explainData.unexplained.toFixed(2) }}</td>
            </tr>
            </tbody>
        </table>
    </div>
</template>

<script>
    import axios from 'axios';

    export default {
        name: 'PnlExplainDetail',
        props: ['fromDate', 'toDate'],
        computed: {
            explainData() {return this.explains[0]}
        },
        mounted() {
            const notify = this.$notify;

            const args = {
                fromDate: this.fromDate,
                toDate: this.toDate
            };

            axios.post('/api/pnlexplain', args)
                .then(response => {
                    this.explains = response.data;
                })
                .catch(error => notify.error(error.response.statusText));
        },
        data() {
            const self = this;
            return {
                explains: [],
            }
        },
    }
</script>

<style scoped>

</style>