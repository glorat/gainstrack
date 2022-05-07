<template>
    <my-page padding>
      <q-table
        :rows="info"
        :columns="columns"
        v-model:pagination="pagination"
        dense
        row-key="account"
      >
        <template v-slot:bottom-row>
          <q-tr>
            <q-td colspan="100%" class="num">
              Total Pnl: <span class="num">{{totalPnl.toFixed(0) }}</span>
            </q-td>
          </q-tr>
        </template>

        <template v-slot:body-cell-account="props">
          <q-td :props="props">
            <router-link :to="{ name: 'irr_detail', params: { accountId: props.value }}">{{ props.value }}</router-link>
          </q-td>
        </template>
      </q-table>
    </my-page>

</template>

<script>
  import numbro from 'numbro'
  import { apiIrrSummary } from 'src/lib/apiFacade'
  import { mapGetters } from 'vuex'
  import { formatNumber, formatPerc } from 'src/lib/utils'

  export default {
    name: 'IrrSummary',
    data () {
      const columns = [{
        name: 'account',
        label: 'Account',
        field: 'accountId',
        align: 'left',
        sortable: true
      }, {
        name: 'start',
        field: 'start',
        label: 'start',
        classes: ['num']
      }, {
        name: 'end',
        field: 'end',
        label: 'end',
        classes: ['num']
      }, {
        name: 'irr',
        field: 'irr',
        label: 'irr',
        classes: ['num'],
        sortable: true,
        format: formatPerc
      }, {
        name: 'pnl',
        label: 'pnl',
        field: (row) => (row.pnlGain + row.flowGain),
        classes: ['num'],
        sortable: true,
        format: formatNumber
      }];

      const pagination = {
          rowsPerPage: 10,
          sortBy: 'pnl',
          descending: true,
        };

      return { info: [], totalPnl:0, columns, pagination }
    },
    methods: {
      async refresh () {
        const notify = this.$notify;
        try {
          this.info = await apiIrrSummary(this.$store)
          this.totalPnl = this.info.reduce((prev, curr) => prev+curr.pnlGain + curr.flowGain, 0);
        } catch (error) {
          console.error(error);
          notify.error(error)
        }
      },
      perc(value) {
        return numbro(value).format('0.00%')
      }
    },
    computed: {
      ...mapGetters([
        'fxConverter',
      ]),
    },
    watch: {
      fxConverter () {
        this.refresh()
      }
    },
    mounted () {
      this.refresh();
    }
  }
</script>

<style scoped>

</style>
