<template>
    <my-page padding>
        <h6>Investment cashflows for <router-link :to="{name:'account', params:{accountId:accountId}}">{{accountId}}</router-link></h6>
        <table class="queryresults sortable">
            <thead>
            <tr>
                <th data-sort="string">account</th>
                <th data-sort="num">date</th>
                <th data-sort="num">value</th>
                <th data-sort="num">cvalue</th>
                <th data-sort="string">source</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(date,index) in detail.dates">
                <td>
                    {{ accountId}}
                </td>
                <td class="string">{{ date }}</td>
                <td class="num" v-bind:data-sort-value="detail.values[index]">{{ detail.values[index]}} {{ detail.units[index]}}</td>
                <td class="num" v-bind:data-sort-value="detail.cvalues[index]">{{ detail.cvalues[index]}}</td>

                <td class="string">{{ detail.description[index] }}</td>
            </tr>
            </tbody>
        </table>
    </my-page>
</template>

<script>
    import axios from 'axios';
    import {mapGetters} from 'vuex';
    import {accountInvestmentReport} from 'src/lib/AccountInvestmentReport';
    import {LocalDate} from '@js-joda/core';
    import {formatNumber} from 'src/lib/utils';

    export default {
        name: 'IrrDetail',
        props: ['accountId'],
        data() {
            return {detail: []}
        },
      methods: {
        async refresh() {
          const localCompute = true;
          const notify = this.$notify;
          try {
            if (localCompute) {
              const report = this.localIrrDetail;

              const cfs = report.cashflowTable.cashflows
              const name = this.accountId;
              const units = cfs.map(cf => cf.value.ccy);
              const dates = cfs.map(cf => cf.date);
              const values = cfs.map(cf => cf.value.number).map(formatNumber);
              const cvalues = cfs.map(cf =>  cf.convertedValue?.number).map(formatNumber)
              const description = cfs.map(cf => cf.source)
              const detail = {name, units, dates, values, cvalues, description};
              this.detail = detail
            } else {
              const response = await axios.get('/api/irr/' + this.accountId);
              this.detail = response.data;
            }
          } catch (error) {
            console.log(error);
            notify.error(error);
          }
        }
      },
      computed: {
        ...mapGetters([
          'baseCcy',
          'allPostingsEx',
          'allTxs',
          'fxConverter',
          'mainAccounts',
          'mainAssetAccounts',
        ]),
        localIrrDetail() {
          const defaultFromDate = LocalDate.parse('1900-01-01')
          const fromDate = defaultFromDate
          const queryDate = LocalDate.now() // Or date override
          const report = accountInvestmentReport( this.accountId, this.baseCcy, fromDate, queryDate, this.allTxs, this.allPostingsEx, this.fxConverter);
          return report;
        },
      },
      mounted() {
        this.refresh()
      },
    }
</script>

<style scoped>

</style>
