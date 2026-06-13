<template>
    <div>
        <div>
            <command-date-editor id="trade-date" v-model="c.date"></command-date-editor>
        </div>
        <div v-if="!hideAccount">
          <account-selector class="c-account-id" placeholder="Source Account"
                            :modelValue="dc.accountId" :original="c.accountId"
                            @update:modelValue="c.accountId=$event" :account-list="tradeableAccounts"></account-selector>
        </div>
        <div>
            <help-tip tag="tradeChange"></help-tip>
          <balance-editor class="c-change" label="Purchased Amount" :modelValue="dc.change" :original="c.change" @update:modelValue="c.change=$event"></balance-editor>
        </div>
        <div>
            <help-tip tag="tradePrice"></help-tip>
          <balance-editor class="c-price" label="Price" :modelValue="dc.price" :original="c.price" @update:modelValue="c.price=$event"></balance-editor>
        </div>
        <div>
            <help-tip tag="tradeCommission"></help-tip>
          <balance-editor label="Commission" class="c-commission"
                          :modelValue="dc.commission" :original="c.commission" @update:modelValue="c.commission=$event"></balance-editor>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import BalanceEditor from '../../lib/assetdb/components/BalanceEditor.vue'
import AccountSelector from '../AccountSelector.vue'
import CommandDateEditor from '../CommandDateEditor.vue'
import HelpTip from '../HelpTip.vue'
import { commandIsValid, defaultedTradeCommand, toGainstrack as toGainstrackFn } from 'src/lib/commandDefaulting'
import { useCommandEditor } from '../../composables/useCommandEditor'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ cmd?: Record<string, any>; options?: Record<string, any> }>()
const emit = defineEmits(['gainstrack-changed', 'command-changed', 'input'])

const { c, hideAccount, tradeableAccounts, fxConverter, allStateEx } = useCommandEditor(props, emit)

const dc = computed(() => defaultedTradeCommand(c, allStateEx.value, fxConverter.value))

const toGainstrack = computed(() => commandIsValid(dc.value) ? toGainstrackFn(dc.value) : '')

watch(toGainstrack, (str) => emit('gainstrack-changed', str), { immediate: true })
</script>
