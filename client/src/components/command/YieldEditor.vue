<template>
    <div>
        <div>
            <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div v-if="!hideAccount">
          <account-selector
            placeholder="Yield Source Account"
            class="c-account-id" :modelValue="dc.accountId" :original="c.accountId"
            @update:modelValue="c.accountId=$event" :account-list="assetAccounts"
          ></account-selector>
        </div>
        <div v-if="multiAsset">
          <!-- TODO: Restrict this asset list to whatever is in this account -->
            <asset-id label="Asset that is yielding" :modelValue="dc.asset" :original="c.asset" @update:modelValue="c.asset = $event"></asset-id>
        </div>
        <div>
          <balance-editor label="Dividend/Interest/Yield" class="change" :modelValue="dc.change" :original="c.change" @update:modelValue="c.change = $event"></balance-editor>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import AccountSelector from '../AccountSelector.vue'
import BalanceEditor from '../../lib/assetdb/components/BalanceEditor.vue'
import CommandDateEditor from '../CommandDateEditor.vue'
import AssetId from '../../lib/assetdb/components/AssetId.vue'
import { defaultedYieldCommand, toGainstrack as toGainstrackFn } from 'src/lib/commandDefaulting'
import { useCommandEditor } from '../../composables/useCommandEditor'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ cmd?: Record<string, any>; options?: Record<string, any> }>()
const emit = defineEmits(['gainstrack-changed', 'command-changed', 'input'])

const { c, hideAccount, mainAssetAccounts, findAccount, fxConverter, allStateEx } = useCommandEditor(props, emit)

const dc = computed(() => defaultedYieldCommand(c, allStateEx.value))

const multiAsset = computed(() => {
  const acct = findAccount.value(c.accountId)
  return acct && acct.options.multiAsset
})

const assetAccounts = computed(() => mainAssetAccounts.value)

const isValid = computed(() =>
  !!dc.value.accountId && dc.value.change?.number && dc.value.change?.ccy && (dc.value.asset || !multiAsset.value)
)

const toGainstrack = computed(() => isValid.value ? toGainstrackFn(dc.value) : '')

watch(toGainstrack, (str) => emit('gainstrack-changed', str), { immediate: true })
</script>
