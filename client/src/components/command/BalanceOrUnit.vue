<template>
  <div>
    <div>
      <command-date-editor v-model="c.date"></command-date-editor>
    </div>
    <div v-if="!hideAccount">
      <account-selector class="c-account-id" :modelValue="dc.accountId" :original="c.accountId"
                        @update:modelValue="c.accountId=$event" :account-list="balanceableAccounts"></account-selector>
    </div>
    <div v-if="showBalance">
      <balance-editor label="Balance" class="c-balance" :modelValue="dc.balance" :original="c.balance" @update:modelValue="c.balance=$event"></balance-editor>
    </div>
    <div v-if="showChange">
      <balance-editor label="Change" class="c-change" :modelValue="dc.change" :original="c.change" @update:modelValue="c.change=$event"></balance-editor>
    </div>
    <div v-if="canBalanceOrUnit">
      <q-radio :modelValue="dc.commandType" @update:modelValue="c.commandType=$event" val="bal" label="Simple Balance" />
      <q-radio :modelValue="dc.commandType" @update:modelValue="c.commandType=$event" val="unit" label="With Cost" />
    </div>

    <div v-if="dc.commandType==='bal'">
      <help-tip tag="balOtherAccount"></help-tip>
      <account-selector class="c-other-account" placeholder="Adjustment Account"
                        :modelValue="dc.otherAccount" :original="c.otherAccount"
                        @update:modelValue="c.otherAccount=$event" :account-list="mainAccounts"></account-selector>
    </div>
    <div v-if="showPrice">
      <balance-editor label="Price" :modelValue="dc.price" :original="c.price" @update:modelValue="c.price=$event"></balance-editor>
    </div>
    <div v-if="showCommission">
      <help-tip tag="tradeCommission"></help-tip>
      <balance-editor label="Commission" class="c-commission"
                      :modelValue="dc.commission" :original="c.commission" @update:modelValue="c.commission=$event"></balance-editor>
    </div>
    <div>
      <q-btn color="secondary" v-if="canConvertToTrade" @click="doConvertToTrade">Convert to Trade</q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import BalanceEditor from '../../lib/assetdb/components/BalanceEditor.vue'
import AccountSelector from '../AccountSelector.vue'
import CommandDateEditor from '../CommandDateEditor.vue'
import HelpTip from '../HelpTip.vue'
import {
  canConvertToTrade as checkCanConvertToTrade, commandIsValid, convertToTrade,
  defaultedCommand, propDefined, toGainstrack as toGainstrackFn
} from 'src/lib/commandDefaulting'
import { useCommandEditor } from '../../composables/useCommandEditor'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ cmd?: Record<string, any>; options?: Record<string, any> }>()
const emit = defineEmits(['gainstrack-changed', 'command-changed', 'input'])

const { c, hideAccount, mainAccounts, allState, allStateEx, fxConverter, findAccount } = useCommandEditor(props, emit)

const dc = computed(() => defaultedCommand(c, allStateEx.value, fxConverter.value))

const mainAccount = computed(() => findAccount.value(dc.value.accountId))

const balanceableAccounts = computed(() =>
  allState.value.accounts
    .filter((acct: any) => {
      const t = /^(Asset|Liabilities|Equity)/.test(acct.accountId)
      return acct.options.generatedAccount === false && t
    })
    .map((a: any) => a.accountId).sort()
)

const showBalance = computed(() => propDefined(dc.value, 'balance'))
const showChange = computed(() => propDefined(dc.value, 'change'))
const showCommission = computed(() => propDefined(dc.value, 'commission'))
const showPrice = computed(() => dc.value.commandType !== 'bal' && propDefined(dc.value, 'price'))

const canBalanceOrUnit = computed(() => {
  if (!dc.value.commandType?.match('bal|unit')) return false
  return !!mainAccount.value?.options.multiAsset
})

const canConvertToTrade = computed(() => checkCanConvertToTrade(c, allStateEx.value, fxConverter.value))

function doConvertToTrade() {
  const newc = convertToTrade(c, allStateEx.value, fxConverter.value)
  Object.assign(c, newc)
}

const toGainstrack = computed(() => commandIsValid(dc.value) ? toGainstrackFn(dc.value) : '')

watch(toGainstrack, (str) => emit('gainstrack-changed', str), { immediate: true })
</script>
