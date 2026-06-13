<template>
  <div>
    <div>
      <command-date-editor v-model="c.date" label="Account Opening Date"></command-date-editor>
    </div>
    <div>
      <q-select v-model="c.accountType" :options="['Assets','Liabilities','Equity','Income','Expenses']"
                label="Account Type"/>
      <q-input label="Account Name" v-model="c.accountName"></q-input>
    </div>
    <div>
      <asset-id v-model="c.ccy" label="Account Currency"></asset-id>
    </div>
    <div>
      <q-toggle
        v-model="c.options.multiAsset"
        label="Multi Asset"
      />
    </div>
    <div>
      <q-toggle v-model="c.options.automaticReinvestment" label="Automatic Reinvestment"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import AssetId from '../../lib/assetdb/components/AssetId.vue'
import CommandDateEditor from '../CommandDateEditor.vue'
import { useCommandEditor } from '../../composables/useCommandEditor'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ cmd?: Record<string, any>; options?: Record<string, any> }>()
const emit = defineEmits(['gainstrack-changed', 'command-changed', 'input'])

const { c } = useCommandEditor(props, emit)

// AccountCreation-specific fields not in the base command state
c.ccy = ''
c.accountType = ''
c.accountName = ''
c.options = { multiAsset: false, automaticReinvestment: false }

const isValid = computed(() => c.date && c.accountType && c.accountName && c.ccy)

const toGainstrack = computed(() => {
  if (!isValid.value) return ''
  const accountId = `${c.accountType}:${c.accountName}`
  let str = `${c.date} open ${accountId} ${c.ccy}`
  if (c.options.multiAsset) str += '\n  multiAsset: true'
  if (c.options.automaticReinvestment) str += '\n  automaticReinvestment: true'
  return str
})

watch(toGainstrack, (str) => emit('gainstrack-changed', str), { immediate: true })
</script>

<style scoped>
  .el-input-group__prepend div.el-select .el-input__inner {
    width: fit-content;
  }
</style>
