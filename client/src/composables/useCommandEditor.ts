import { reactive, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores'
import type { AmountEditing } from 'src/lib/assetdb/models'

export interface CommandState {
  date: string
  change: AmountEditing
  balance: AmountEditing
  price: AmountEditing
  commission: AmountEditing
  accountId: string
  otherAccount: string
  options: Record<string, any>
  asset: string
  commandType?: string
  [key: string]: any
}

export function useCommandEditor(
  props: { cmd?: Record<string, any> | null; options?: Record<string, any> | null },
  emit: (event: 'input' | 'command-changed', ...args: any[]) => void
) {
  const store = useAppStore()
  const {
    tradeableAccounts,
    findAccount,
    mainAccounts,
    mainAssetAccounts,
    fxConverter,
    allStateEx,
    allState,
  } = storeToRefs(store)

  const base = props.cmd ? { ...props.cmd } : {}
  const c = reactive<CommandState>({
    ...base,
    date: base.date || new Date().toISOString().slice(0, 10),
    change: base.change || { number: 0, ccy: '' },
    balance: base.balance || { number: 0, ccy: '' },
    price: base.price || { number: 0, ccy: '' },
    commission: base.commission || { number: 0, ccy: '' },
    accountId: base.accountId || '',
    otherAccount: base.otherAccount || '',
    options: base.options || {},
    asset: base.asset || '',
  })

  const hideAccount = computed(() => !!(props.options?.hideAccount))

  watch(c, () => {
    emit('command-changed', { ...c })
    emit('input', { ...c })
  }, { deep: true })

  return {
    c,
    hideAccount,
    tradeableAccounts,
    findAccount,
    mainAccounts,
    mainAssetAccounts,
    fxConverter,
    allStateEx,
    allState,
  }
}
