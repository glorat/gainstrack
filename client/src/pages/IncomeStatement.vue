<template>
  <my-page padding>
    <div>
      <conversion-select></conversion-select>
    </div>
    <div class="row">
      <div class="column">
        <h5>Income</h5>
        <tree-table v-bind:node="info['Income']"></tree-table>
      </div>
      <div class="column">
        <h5>Expenses</h5>
        <tree-table v-bind:node="info['Expenses']"></tree-table>
      </div>
    </div>
  </my-page>
</template>

<script setup lang="ts">
import TreeTable from '../components/TreeTable.vue'
import ConversionSelect from '../components/ConversionSelect.vue'
import { useAppStore } from 'src/stores'
import { computed, onMounted } from 'vue'
import { qnotify } from 'src/boot/notify'

const store = useAppStore()

const info = computed(() => store.balances)

onMounted(() => {
  store.computeBalances().catch((error: unknown) => qnotify.error(String(error)))
})
</script>

<style scoped>

</style>
