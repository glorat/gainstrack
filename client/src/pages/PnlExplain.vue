<template>
    <div>

        <div class="block">
            <span class="demonstration">P&L Explain Date Range: </span>
            <el-date-picker
                    v-model="selectedRange"
                    type="daterange"
                    align="right"
                    unlink-panels
                    range-separator="To"
                    start-placeholder="Start date"
                    end-placeholder="End date"
                    :picker-options="pickerOptions">
            </el-date-picker>
            <button @click="submit" :disabled="selectedRange==null">Go</button>
        </div>
        <div class="block" v-if="explainData.actual">
            P&L Explanation
<!--            Map("actual" -> actualPnl, "explained" -> explained, "unexplained" -> unexplained,-->
<!--            "newActivityPnl" -> newActivityPnl,-->
<!--            "totalEquity" -> totalEquity, "totalIncome" -> totalIncome, "totalExpense" -> totalExpense, "totalDeltaExplain" -> totalDeltaExplain-->
<!--            // , "delta" -> deltaExplain-->
<!--            )-->
            <table class="sortable">
                <tbody>
                <tr>
                    <td>Price Appreciation Profit</td>
                    <td class="num">{{ explainData.totalDeltaExplain.toFixed(2) }}</td>
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
    </div>
</template>

<script>
    import axios from 'axios';
    import {DatePicker} from 'element-ui';
    import lang from 'element-ui/lib/locale/lang/en'
    import locale from 'element-ui/lib/locale'

    locale.use(lang);

    export default {
        name: 'PnlExplain',
        components: {'el-date-picker': DatePicker},
        computed: {
            latestDate() {
                return this.$store.state.summary.latestDate;
            },
        },
        methods: {
            submit() {
                const args = {
                    fromDate: this.selectedRange[0].toISOString().split('T')[0],
                    toDate: this.selectedRange[1].toISOString().split('T')[0]
                };

                const self = this;
                const notify = this.$notify;

                axios.post('/api/pnlexplain', args)
                    .then(response => {
                        self.explainData = response.data;
                    })
                    .catch(error => notify.error(error));

            }
        },
        data() {
            const self = this;
            return {
                explainData: {},
                pickerOptions: {
                    shortcuts: [{
                        text: 'Last week',
                        onClick(picker) {
                            const end = new Date(self.latestDate);
                            const start = new Date();
                            start.setTime(end.getTime() - 3600 * 1000 * 24 * 7);
                            picker.$emit('pick', [start, end]);
                        }
                    }, {
                        text: 'Last month',
                        onClick(picker) {
                            const end = new Date(self.latestDate);
                            const start = new Date();
                            start.setTime(end.getTime());
                            start.setMonth(start.getMonth() - 1);
                            // start.setTime(end.getTime() - 3600 * 1000 * 24 * 30);
                            picker.$emit('pick', [start, end]);
                        }
                    }, {
                        text: 'Last 12 months',
                        onClick(picker) {
                            const end = new Date(self.latestDate);
                            const start = new Date();
                            start.setTime(end.getTime());
                            start.setMonth(start.getMonth() - 12);
                            picker.$emit('pick', [start, end]);
                        }
                    }, {
                        text: 'Year to date',
                        onClick(picker) {
                            const end = new Date(self.latestDate);
                            const start = new Date();
                            start.setTime(end.getTime());
                            start.setMonth(0);
                            picker.$emit('pick', [start, end]);
                        }
                    }]
                },
                selectedRange: null,
            };

        }
    }
</script>

<style scoped>

</style>