<template>
    <div>
        <div>
          <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div v-if="!hideAccount">
            <account-selector class="c-account-id" v-model="c.accountId" @update:modelValue="accountIdChanged" :account-list="balanceableAccounts"></account-selector>
        </div>
        <div>
            <balance-editor label="Balance" class="c-balance" v-model="c.balance"></balance-editor>
        </div>
        <div>
            <help-tip tag="balOtherAccount"></help-tip>
            <account-selector class="c-other-account" placeholder="Adjustment Account" v-model="c.otherAccount" :account-list="mainAccounts"></account-selector>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import BalanceEditor from '../../lib/assetdb/components/BalanceEditor.vue'
import AccountSelector from '../AccountSelector.vue'
import CommandDateEditor from '../CommandDateEditor.vue'
import HelpTip from '../HelpTip.vue'
import { useCommandEditor } from '../../composables/useCommandEditor'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ cmd?: Record<string, any>; options?: Record<string, any> }>()
const emit = defineEmits(['gainstrack-changed', 'command-changed', 'input'])

const { c, hideAccount, mainAccounts, allState, findAccount } = useCommandEditor(props, emit)

function accountIdChanged() {
  const acct = findAccount.value(c.accountId)
  if (acct) {
    c.balance.ccy = acct.ccy
  }
  const allCmds = [...allState.value.commands].reverse()
  const prev = allCmds.find((x: any) => x.accountId === c.accountId && x.commandType === 'bal')
  if (prev) {
    c.otherAccount = prev.otherAccount
    c.balance.number = prev.balance.number
  } else {
    c.otherAccount = 'Equity:Opening'
  }
}

const balanceableAccounts = computed(() =>
  allState.value.accounts
    .filter((acct: any) => {
      const t = /^(Asset|Liabilities|Equity)/.test(acct.accountId)
      return acct.options.generatedAccount === false && t
    })
    .map((a: any) => a.accountId).sort()
)

const isValid = computed(() => c.accountId && c.date && c.balance && c.balance.ccy && c.otherAccount)

const toGainstrack = computed(() => {
  if (isValid.value) return `${c.date} bal ${c.accountId} ${c.balance.number} ${c.balance.ccy} ${c.otherAccount}`
  return ''
})

watch(toGainstrack, (str) => emit('gainstrack-changed', str), { immediate: true })
</script>
