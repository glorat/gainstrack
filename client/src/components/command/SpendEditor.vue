<template>
    <div>
        <div>
            <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div v-if="!hideAccount">
          <account-selector
            placeholder="Spending Source"
            class="c-account-id" :modelValue="dc.accountId" :original="c.accountId"
            @update:modelValue="c.accountId=$event" :account-list="spendableAccounts"
          ></account-selector>
        </div>
        <div>
          <balance-editor label="Spent Amount" class="change" :modelValue="dc.change" :original="c.change" @update:modelValue="c.change=$event"></balance-editor>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import AccountSelector from '../AccountSelector.vue'
import BalanceEditor from '../../lib/assetdb/components/BalanceEditor.vue'
import CommandDateEditor from '../CommandDateEditor.vue'
import { useCommandEditor } from '../../composables/useCommandEditor'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ cmd?: Record<string, any>; options?: Record<string, any> }>()
const emit = defineEmits(['gainstrack-changed', 'command-changed', 'input'])

const { c, hideAccount, mainAccounts, findAccount } = useCommandEditor(props, emit)

const dc = computed(() => {
  const result = { ...c }
  const acct = findAccount.value(c.accountId)
  if (acct && !result.change.ccy) result.change = { ...result.change, ccy: acct.ccy }
  return result
})

const spendableAccounts = computed(() => mainAccounts.value.filter((x: string) => x.startsWith('Expenses:')))

const isValid = computed(() => !!dc.value.accountId && dc.value.change.number && dc.value.change.ccy)

const toGainstrack = computed(() => {
  const cmd = dc.value
  if (isValid.value) return `${cmd.date} spend ${cmd.accountId} ${cmd.change.number} ${cmd.change.ccy}`
  return ''
})

watch(toGainstrack, (str) => emit('gainstrack-changed', str), { immediate: true })
</script>
