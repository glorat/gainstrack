<template>
    <my-page padding>
        <div>
<!--            <account-graph :key="conversion" accountId="Assets"></account-graph>-->
          <networth-sunburst :height="200" :key="conversion"></networth-sunburst>
        </div>
        <div>
            <conversion-select></conversion-select>
        </div>
        <div class="row">
            <div class="col-md-6">
                <h5 id="assets-table">Assets</h5>
                <tree-table v-bind:node="info['Assets']"></tree-table>
            </div>
            <div class="col-md-6">
                <h5>Liabilities</h5>
                <tree-table v-bind:node="info['Liabilities']"></tree-table>
                <h5>Equity</h5>
                <tree-table v-bind:node="info['Equities']"></tree-table>
            </div>
        </div>
    </my-page>
</template>

<script setup lang="ts">
import TreeTable from 'src/components/TreeTable.vue'
import ConversionSelect from 'src/components/ConversionSelect.vue'
import NetworthSunburst from 'components/NetworthSunburst.vue'
import { useAppStore } from 'src/stores'
import { computed, onMounted } from 'vue'
import { qnotify } from 'src/boot/notify'

const store = useAppStore()

const info = computed(() => store.balances)
const conversion = computed(() => store.conversion)

onMounted(() => {
  store.computeBalances().catch((error: unknown) => qnotify.error(String(error)))
})
</script>

<style scoped>

</style>
