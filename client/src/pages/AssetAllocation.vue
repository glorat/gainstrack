<template>
    <my-page padding>
       <vue-plotly :data="treeData" :layout="treeLayout" :options="treeOptions" auto-resize></vue-plotly>

        <div class="row">
            <div class="col-md-6" v-for="table in tables">
                <h6>{{ table.name }}</h6>
                <tree-table v-bind:node="table.rows"></tree-table>
            </div>
        </div>

    </my-page>
</template>

<script setup lang="ts">
import TreeTable from '../components/TreeTable.vue'
import { VuePlotly } from '../lib/loader'
import { ref, onMounted } from 'vue'
import { LocalDate } from '@js-joda/core'
import { qnotify } from 'src/boot/notify'
import { useAppStore } from 'src/stores'
import { AllocationTable, allocationTables, allocationTree, networthPositions } from 'src/lib/assetAllocation'

const store = useAppStore()

const treeData = ref<Record<string, unknown>[]>([{
  type: 'sunburst',
  ids: ['loading'],
  labels: ['Loading'],
  parents: [''],
}])

const treeLayout = ref({
  autosize: true,
  margin: { l: 0, r: 0, b: 0, t: 0 },
  sunburstcolorway: ['#636efa', '#ef553b', '#00cc96'],
})

const treeOptions = ref({ displaylogo: false })
const tables = ref<AllocationTable[]>([])

onMounted(() => {
  try {
    const date = LocalDate.now()
    const postings = store.allPostingsEx
    const positions = networthPositions(postings)
    const assetState = store.allState.assetState
    const baseCcy = store.baseCcy
    const fx = store.fxConverter

    const data = allocationTree(positions, assetState, baseCcy, date, fx)
    treeData.value = [{
      ...data,
      type: 'sunburst',
      name: 'Networth',
      branchvalues: 'total',
      hovertemplate: '%{label}<br>%{value:,f}<br>%{percentParent:.1%}<br>%{percentRoot:.1%}',
      // The root doesn't accept percentParent, so its template is stubbed out.
      texttemplate: ['Networth', ...Array(Math.max(data.ids.length - 1, 0)).fill('%{label}<br>%{percentParent:.1%}')],
    }]

    tables.value = allocationTables(store.allState.accounts, postings, assetState, baseCcy, date, fx)
  } catch (error: unknown) {
    qnotify.error(String(error))
  }
})
</script>

<style scoped>

</style>
