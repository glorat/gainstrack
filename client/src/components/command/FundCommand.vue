<template>
    <div>
        <div>
            <command-date-editor v-model="c.date"></command-date-editor>
        </div>
      <div v-if="!hideAccount">
        <account-selector class="c-account-id" :modelValue="dc.accountId" :original="c.accountId"
                          @update:modelValue="c.accountId=$event" :account-list="fundableAccounts"
                          placeholder="Account to fund"
        ></account-selector>
      </div>
      <div>
        <balance-editor class="c-change" label="Funding Amount" :modelValue="dc.change" :original="c.change" @update:modelValue="c.change=$event"></balance-editor>
      </div>
        <div>
            Override funding source (optional) <help-tip tag="fundOtherAccount"></help-tip>
          <account-selector class="c-other-account" placeholder="Funding Account"
                            :modelValue="dc.otherAccount" :original="c.otherAccount"
                            @update:modelValue="c.otherAccount=$event"
          ></account-selector>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import BalanceEditor from '../../lib/assetdb/components/BalanceEditor.vue'
import AccountSelector from '../AccountSelector.vue'
import CommandDateEditor from '../CommandDateEditor.vue'
import HelpTip from '../HelpTip.vue'
import { commandIsValid, defaultedFundCommand, toGainstrack as toGainstrackFn } from 'src/lib/commandDefaulting'
import { useCommandEditor } from '../../composables/useCommandEditor'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ cmd?: Record<string, any>; options?: Record<string, any> }>()
const emit = defineEmits(['gainstrack-changed', 'command-changed', 'input'])

const { c, hideAccount, allState, allStateEx, fxConverter } = useCommandEditor(props, emit)

const dc = computed(() => defaultedFundCommand(c, allStateEx.value, fxConverter.value))

const fundableAccounts = computed(() => {
  const acctMatch = /^(Assets|Liabilities)/
  return allState.value.accounts
    .filter((x: any) => acctMatch.test(x.accountId) && !x.options.generatedAccount)
    .map((x: any) => x.accountId).sort()
})

const toGainstrack = computed(() => commandIsValid(dc.value) ? toGainstrackFn(dc.value) : '')

watch(toGainstrack, (str) => emit('gainstrack-changed', str), { immediate: true })
</script>
