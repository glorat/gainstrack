<template>
  <my-page padding>
    <q-tabs v-model="accountId" inline-label class="bg-secondary text-white" no-caps>
      <q-tab name="Assets" label="Assets"></q-tab>
      <q-tab name="Liabilities"  label="Liabilities"></q-tab>
      <q-tab name="Income"  label="Income"></q-tab>
      <q-tab name="Expenses"  label="Expenses"></q-tab>
      <q-tab name="Equity"  label="Equity"></q-tab>
    </q-tabs>

    <networth-sunburst :height="200" :account-id="accountId"></networth-sunburst>
    <q-table dense :data="data" :columns="columns" :pagination="pagination" @row-click="onRowClick">
      <template v-slot:bottom-row>
        <q-tr>
          <q-td>
            Total:
          </q-td>
          <q-td class="num">
            {{ totalValueStr }}
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </my-page>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {apiAccountSummary} from 'src/lib/apiFacade';
import {sum} from 'lodash';
import {formatNumber} from 'src/lib/utils';
import NetworthSunburst from 'components/NetworthSunburst.vue';

export default defineComponent({
  name: 'CommandSummary',
  components: {NetworthSunburst},
  data() {
    return {
      columns: [] as any[],
      data: [] as Record<string, any>[],
      pagination: {
        rowsPerPage: 30,
        sortBy: 'accountId',
        descending: false,
      },
      accountId: 'Assets'
    }
  },
  methods: {
    async refresh() {
      const {columns, data} = await apiAccountSummary(this.$store, {accountId: this.accountId})
      this.columns = columns;
      this.data = data;
    },
    onRowClick(ev: any, row: Record<string, any>): void {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this.$router.push({name: 'account', params: {accountId: row.accountId}}).catch(() => {});
    },
  },
  watch: {
    accountId() {
      this.refresh();
    }
  },
  computed: {
    totalValue():number {
      const allVals = this.data.map(row => row.balance);
      return sum(allVals);
    },
    totalValueStr():string {
      return formatNumber(this.totalValue);
    },
  },
  mounted() {
    this.refresh()
  }
})
</script>

<style scoped>

</style>
