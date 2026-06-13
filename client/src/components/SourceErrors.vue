<template>
    <div>
        <table v-if="errors.length>0" class="errors sortable">
            <thead>
            <tr>
                <th data-sort="num">Line</th>
                <th data-sort="string">Error</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="error in errors" @click="onRowClick(error)">
                <td class="num">
                    <span class="source">{{ error.line }}</span>
                </td>
                <td >{{ error.message }}</td>
            </tr>
            </tbody>
        </table>
        <p v-else>
            No errors
        </p>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from 'src/stores'
import type { ParseError } from 'src/lib/assetdb/models'

const props = defineProps<{ errs?: ParseError[] }>()
const store = useAppStore()
const router = useRouter()

const errors = computed((): ParseError[] => props.errs ?? store.parseState.errors)

function onRowClick(error: ParseError) {
  if (error.line) {
    void router.push({ path: 'editor', query: { line: error.line.toString() } })
  }
}
</script>

<style scoped>

</style>
