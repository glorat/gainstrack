<template>
    <my-page padding>
        <table class="queryresults sortable">
            <thead>
            <tr>
                <th data-sort="string">account</th>
                <th data-sort="num">balance</th>
                <th data-sort="num">start</th>
                <th data-sort="num">end</th>
                <th data-sort="num">irr</th>
            </tr>
            </thead>
            <tbody>
            <tr v-bind:key="row.accountId" v-for="row in info">
                <td><router-link :to="{ name: 'irr_detail', params: { accountId: row.accountId }}">{{ row.accountId }}</router-link></td>
                <td class="num">{{row.endBalance}}</td>
                <td class="num" v-bind:data-sort-value="row.start">{{ row.start }}</td>
                <td class="num" v-bind:data-sort-value="row.end">{{ row.end }}</td>
                <td class="num">{{ row.irr | numeral("0.00%")}}</td>
            </tr>
            </tbody>
        </table>
    </my-page>

</template>

<script>
    import axios from 'axios';
    import numbro from 'numbro';
    import {irrSummary} from 'src/lib/AccountInvestmentReport';
    import {mapGetters} from 'vuex';
    import {LocalDate} from '@js-joda/core';

    export default {
        name: 'IrrSummary',
        data() {
            return {info: []}
        },
        filters: {
          numeral: (value, format) => numbro(value).format(format)
        },
      methods: {
        async refresh() {
          const localCompute = true;
          const notify = this.$notify;
          try {
            if (localCompute) {
              const defaultFromDate = LocalDate.parse('1900-01-01')
              const fromDate = defaultFromDate
              const queryDate = LocalDate.now() // Or date override
              const allAccounts = this.mainAssetAccounts;
              this.info = irrSummary(allAccounts, this.baseCcy, fromDate, queryDate, this.allTxs, this.allPostingsEx, this.fxConverter)
            } else {
              const response = await axios.get('/api/irr/');
              this.info = response.data;
            }
          } catch (error) {
            console.error(error);
            notify.error(error)
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
      },
      mounted() {
        this.refresh()
      },
    }
</script>

<style scoped>

</style>
