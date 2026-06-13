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

<script setup lang="ts">
import { apiIrrSummary } from 'src/lib/apiFacade'
import { useAppStore } from 'src/stores'
import { formatNumber, formatPerc } from 'src/lib/utils'
import { ref, watch, onMounted } from 'vue'
import { qnotify } from 'src/boot/notify'

type IrrRow = Awaited<ReturnType<typeof apiIrrSummary>>[number]

const store = useAppStore()

const columns = [
  { name: 'account', label: 'Account', field: 'accountId', align: 'left' as const, sortable: true },
  { name: 'start', field: 'start', label: 'start', classes: 'num' },
  { name: 'end', field: 'end', label: 'end', classes: 'num' },
  { name: 'irr', field: 'irr', label: 'irr', classes: 'num', sortable: true, format: formatPerc },
  { name: 'pnl', label: 'pnl', field: (row: IrrRow) => (row.pnlGain + row.flowGain), classes: 'num', sortable: true, format: formatNumber },
]

const pagination = ref({ rowsPerPage: 10, sortBy: 'pnl', descending: true })
const info = ref<IrrRow[]>([])
const totalPnl = ref(0)

async function refresh() {
  try {
    info.value = await apiIrrSummary(store)
    totalPnl.value = info.value.reduce((prev, curr) => prev + curr.pnlGain + curr.flowGain, 0)
  } catch (error) {
    console.error(error)
    qnotify.error(String(error))
  }
}

watch(() => store.fxConverter, () => { void refresh() })
onMounted(() => { void refresh() })
</script>

<style scoped>

</style>
