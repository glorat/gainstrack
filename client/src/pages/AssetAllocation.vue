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
import axios from 'axios'
import TreeTable from '../components/TreeTable.vue'
import { VuePlotly } from '../lib/loader'
import { ref, onMounted } from 'vue'
import { qnotify } from 'src/boot/notify'
import type { TreeTableDTO } from 'src/lib/assetdb/models'

interface AssetAllocationTable {
  name: string
  rows: TreeTableDTO
}

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
const tables = ref<AssetAllocationTable[]>([])

onMounted(() => {
  axios.post('/api/aa/tree')
    .then(response => {
      const data = response.data as Record<string, unknown>
      const plotly: Record<string, unknown> = {
        ...data,
        type: 'sunburst',
        name: 'Networth',
        branchvalues: 'total',
        hovertemplate: '%{label}<br>%{value:,f}<br>%{percentParent:.1%}<br>%{percentRoot:.1%}',
      }
      // Root element doesn't accept percentParent so we stub out the template
      const ids = plotly.ids as string[]
      const ts: string[] = Array(ids.length).fill('%{label}<br>%{percentParent:.1%}')
      ts.unshift('Networth')
      plotly.texttemplate = ts
      treeData.value = [plotly]
    })
    .catch((error: unknown) => qnotify.error(String(error)))

  axios.post('/api/aa/table')
    .then(response => { tables.value = response.data as AssetAllocationTable[] })
    .catch((error: unknown) => qnotify.error(String(error)))
})
</script>

<style scoped>

</style>
