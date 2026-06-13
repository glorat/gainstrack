<template>
    <div>
        <div>
            <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div>
          <account-selector class="c-account-id" placeholder="Source Account"
                            :modelValue="dc.accountId" :original="c.accountId"
                            @update:modelValue="c.accountId=$event" :account-list="transferableAccounts"></account-selector>
        </div>
        <div>
          <balance-editor label="Transfer Amount" class="c-change" :modelValue="dc.change" :original="c.change" @update:modelValue="c.change=$event"></balance-editor>
        </div>
        <div>
          <account-selector class="c-other-account" placeholder="Target Account"
                            :modelValue="dc.otherAccount" :original="c.otherAccount"
                            @update:modelValue="c.otherAccount=$event" :account-list="transferableAccounts"></account-selector>
        </div>
        <div>
          <balance-editor label="Target Amount" class="c-options-target-change"
                          :modelValue="dc.options.targetChange" :original="c.options.targetChange || {}"
                          @update:modelValue="c.options = {...c.options, targetChange:$event}"
                          ></balance-editor>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import BalanceEditor from '../../lib/assetdb/components/BalanceEditor.vue'
import AccountSelector from '../AccountSelector.vue'
import CommandDateEditor from '../CommandDateEditor.vue'
import { commandIsValid, defaultedTransferCommand, toGainstrack as toGainstrackFn } from 'src/lib/commandDefaulting'
import { useCommandEditor } from '../../composables/useCommandEditor'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ cmd?: Record<string, any>; options?: Record<string, any> }>()
const emit = defineEmits(['gainstrack-changed', 'command-changed', 'input'])

const { c, mainAccounts, fxConverter, allStateEx } = useCommandEditor(props, emit)

const dc = computed(() => defaultedTransferCommand(c, allStateEx.value, fxConverter.value))

const transferableAccounts = computed(() => mainAccounts.value)

const toGainstrack = computed(() => commandIsValid(dc.value) ? toGainstrackFn(dc.value) : '')

watch(toGainstrack, (str) => emit('gainstrack-changed', str), { immediate: true })
</script>
