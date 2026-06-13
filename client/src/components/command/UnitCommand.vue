<template>
    <div>
        <div>
          <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div v-if="!hideAccount">
            <account-selector v-model="c.accountId" :account-list="tradeableAccounts" @update:modelValue="accountIdChanged"></account-selector>
        </div>
        <div>
            Balance
            <balance-editor v-model="c.balance"></balance-editor>
        </div>
        <div>
            Price
            <balance-editor v-model="c.price"></balance-editor>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import AccountSelector from '../AccountSelector.vue'
import BalanceEditor from '../../lib/assetdb/components/BalanceEditor.vue'
import CommandDateEditor from '../CommandDateEditor.vue'
import { LocalDate } from '@js-joda/core'
import { useCommandEditor } from '../../composables/useCommandEditor'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ cmd?: Record<string, any>; options?: Record<string, any> }>()
const emit = defineEmits(['gainstrack-changed', 'command-changed', 'input'])

const { c, hideAccount, tradeableAccounts, findAccount, fxConverter, allStateEx } = useCommandEditor(props, emit)

function defaultStuff() {
  const underCcy = allStateEx.value.underlyingCcy(c.balance.ccy ?? '', c.accountId)
  if (underCcy) {
    c.price.ccy = underCcy
    if (c.balance.ccy && c.price.ccy && c.date) {
      const dt = LocalDate.parse(c.date)
      c.price.number = fxConverter.value.getFXTrimmed(c.balance.ccy, c.price.ccy, dt)
    }
  }
}

function accountIdChanged() {
  const acct = findAccount.value(c.accountId)
  if (acct) {
    c.price.ccy = acct.ccy
    c.commission.ccy = acct.ccy
    defaultStuff()
  }
}

onMounted(() => {
  if (!c.balance.number) defaultStuff()
})

const toGainstrack = computed(() =>
  `${c.date} unit ${c.accountId} ${c.balance.number} ${c.balance.ccy} @${c.price.number} ${c.price.ccy}`
)

watch(toGainstrack, (str) => emit('gainstrack-changed', str), { immediate: true })
</script>
