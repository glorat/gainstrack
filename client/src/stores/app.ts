import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SingleFXConversion, SingleFXConverter } from '../lib/fx'
import axios, { InternalAxiosRequestConfig } from 'axios'
import {
  AccountDTO,
  AllState, AssetDTO,
  emptyAllState,
  PostingEx,
  Transaction, TreeTableDTO
} from '../lib/assetdb/models'
import { GlobalPricer } from '../lib/pricer'
import { AllStateEx } from '../lib/AllStateEx'
import { generateAllStateSafe } from '../lib/gen/GainstrackGenerator'
import { cloneDeep, includes, keys, mergeWith } from 'lodash'
import { balanceTreeTable } from '../lib/TreeTable'
import { LocalDate } from '@js-joda/core'
import { toCommodityGainstrack } from '../lib/commandDefaulting'
import { QuoteSource } from 'src/lib/assetdb/assetDb'
import { User } from 'firebase/auth'
import { Notify } from 'quasar'

export interface TimeSeries {
  x: string[]
  y: number[]
  name: string
}

export interface AccountBalances {
  Assets?: TreeTableDTO
  Liabilities?: TreeTableDTO
  Equities?: TreeTableDTO
  Income?: TreeTableDTO
  Expenses?: TreeTableDTO
}

type FXConverterWrapper = (fx: SingleFXConversion) => SingleFXConverter

export const useAppStore = defineStore('app', () => {
  // Axios interceptors (set up once when store is first used)
  let requestPreprocessor = async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => config

  axios.interceptors.request.use(
    config => requestPreprocessor(config),
    error => Promise.reject(error)
  )

  axios.interceptors.response.use(res => res, function (error) {
    if (error.response.status === 401) {
      if (error.request.responseURL.startsWith(window.location.origin)) {
        Notify.create({ message: 'Please log out and in again!', type: 'negative' })
        return Promise.reject(error)
      } else {
        return error
      }
    }
  })

  // State
  const allState = ref<AllState>(emptyAllState)
  const dateOverride = ref<LocalDate | undefined>(undefined)
  const count = ref(0)
  const quoteConfig = ref<QuoteSource[]>([])
  const balances = ref<AccountBalances>({})
  const parseState = ref<Record<string, unknown>>({ errors: [] })
  const gainstrackText = ref('')
  const quotes = ref<Record<string, TimeSeries>>({})
  const conversion = ref('parent')
  const user = ref<User | undefined>(undefined)
  const authToken = ref<string | undefined>(undefined)

  // Getters
  const isAuthenticated = computed(() => !!authToken.value)
  const allStateEx = computed(() => new AllStateEx(allState.value))
  const accountIds = computed(() => allState.value.accounts.map(x => x.accountId))
  const reloadCounter = computed(() => count.value)
  const tradeableAccounts = computed(() =>
    allState.value.accounts
      .filter(x => x.accountId.startsWith('Asset') && x.options.multiAsset && !x.options.generatedAccount)
      .map(x => x.accountId).sort()
  )
  const mainAssetAccounts = computed(() =>
    allState.value.accounts
      .filter(x => x.accountId.startsWith('Asset') && !x.options.generatedAccount)
      .map(x => x.accountId).sort()
  )
  const mainAccounts = computed(() =>
    allState.value.accounts
      .filter(acct => acct.options.generatedAccount === false)
      .map(a => a.accountId).sort()
  )
  const findAccount = computed(() => (accountId: string) =>
    allState.value.accounts.find((x: AccountDTO) => x.accountId === accountId)
  )
  const baseCcy = computed(() => allState.value.baseCcy)
  const tradeFxConverter = computed(() => {
    if (allState.value) return allStateEx.value.tradeFxConverter()
    return SingleFXConversion.empty()
  })
  const customFxConverter = computed(() => (wrapper: FXConverterWrapper) => {
    const marketFx = SingleFXConversion.fromQuotes(quotes.value)
    const wrapped = wrapper(marketFx)
    return new GlobalPricer(allState.value.commands, allState.value.ccys, tradeFxConverter.value, wrapped)
  })
  const fxConverter = computed(() => {
    const identity: FXConverterWrapper = x => x
    return customFxConverter.value(identity)
  })
  const quoteDeps = computed(() => {
    const pricer = fxConverter.value as GlobalPricer
    const assets = allState.value.assetState
    const reducer = (prev: Record<string, string[]>, item: Record<string, string[]>) =>
      mergeWith(prev, item, (x: string[], y: string[]) => (x || []).concat(y))
    return assets.map(asset => pricer.quotesRequired(asset)).reduce(reducer, {})
  })
  const allTxs = computed((): Transaction[] => allStateEx.value.allTxs())
  const allPostings = computed(() => allStateEx.value.allPostings())
  const allPostingsEx = computed((): PostingEx[] => allStateEx.value.allPostingsEx())
  const allCcys = computed((): string[] => allState.value.ccys)

  // Actions
  function changeUser(userData?: User | undefined) {
    user.value = userData
  }

  async function computeBalances() {
    if (!balances.value.Assets) {
      const today = (dateOverride.value ?? LocalDate.now()) as LocalDate
      const forCategory = (cat: string) => balanceTreeTable(
        cat, today, baseCcy.value, conversion.value,
        allState.value.accounts, allPostingsEx.value, fxConverter.value
      )
      const result: AccountBalances = {
        Assets: forCategory('Assets'),
        Liabilities: forCategory('Liabilities'),
        Expenses: forCategory('Expenses'),
        Income: forCategory('Income'),
        Equities: forCategory('Equity')
      }
      balances.value = result
      return result
    }
  }

  async function loadMultiQuotes(ccys: string[]): Promise<TimeSeries[]> {
    const deps = quoteDeps.value
    const reqs = ccys.map(ccy => {
      const depsList = deps[ccy]
      const depFilter = (p: PostingEx) => includes(depsList, p.value.ccy)
      const allPEx: PostingEx[] = allPostingsEx.value
      const dts = allPEx.filter(depFilter).map(p => p.date).sort()
      const fromDate = dts[0] ?? LocalDate.now()
      return { name: ccy, fromDate }
    })
    // Blank placeholders to prevent stampeding requests
    reqs.forEach(req => { quotes.value[req.name] = { x: [], y: [], name: req.name } })

    const response = await axios.post('/api/quotes/tickers', { quotes: reqs })
    const multiSeries: TimeSeries[] = response.data
    multiSeries.forEach(row => { quotes.value[row.name] = row })
    return multiSeries
  }

  async function loadQuotes(ccy: string): Promise<TimeSeries> {
    if (quotes.value[ccy]) return quotes.value[ccy]
    const multi = await loadMultiQuotes([ccy])
    return multi[0]
  }

  async function loadQuotesRaw(key: string): Promise<TimeSeries> {
    if (key && quotes.value[key]) return quotes.value[key]
    const multi = await loadMultiQuotes([key])
    return multi[0]
  }

  async function fetchGainstrackText(): Promise<string> {
    if (!gainstrackText.value) {
      const response = await axios.post('/api/editor/')
      gainstrackText.value = response.data.source
      return response.data.source
    }
    return gainstrackText.value
  }

  function setGainstrackText(text: string) {
    gainstrackText.value = text
  }

  async function loadLocalText(text: string) {
    const { state, errors } = generateAllStateSafe(text)
    if (!state) return { ok: false, errors }
    allState.value = state
    balances.value = {}
    gainstrackText.value = ''
    parseState.value = { errors: [] }
    count.value++
    await loadMultiQuotes(keys(quoteDeps.value))
    await computeBalances()
    return { ok: true, errors: [], accounts: state.accounts.length, txs: state.txs.length, baseCcy: state.baseCcy }
  }

  async function setConversion(c: string) {
    await axios.post('/api/state/conversion', { conversion: c })
    conversion.value = c
    balances.value = {}
    await computeBalances()
  }

  async function reload() {
    const response = await loadAllState()
    const quotesConfig = await axios.get('/api/quotes/config')
    quoteConfig.value = quotesConfig.data
    return response
  }

  async function loadAllState() {
    const response = await axios.post('/api/allState')
    allState.value = response.data
    balances.value = {}
    gainstrackText.value = ''
    parseState.value = { errors: [] }
    count.value++
    const quotesToLoad = keys(quoteDeps.value)
    console.log(`Pre-load quotes for ${quotesToLoad.join(',')}`)
    await loadMultiQuotes(quotesToLoad)
    console.log('Pre-load of quotes complete')
    await computeBalances()
    return response
  }

  async function setDateOverride(d: string) {
    await axios.post('/api/state/dateOverride', { dateOverride: d })
    dateOverride.value = LocalDate.parse(d)
    balances.value = {}
    await computeBalances()
  }

  async function upsertAsset(asset: AssetDTO) {
    const str = toCommodityGainstrack(asset)
    const res = await axios.post('/api/post/asset', { str })
    const originalAssets = allState.value.assetState
    const orig = originalAssets.find(x => x.asset === asset.asset)
    if (orig === undefined) throw new Error('Invariant violation in assetSave')
    const idx = originalAssets.indexOf(orig)
    Object.assign(originalAssets[idx], cloneDeep(asset))
    return res
  }

  async function login(data: Record<string, unknown>) {
    const summary = await axios.post('/api/authn/login', data)
    await loadAllState()
    return summary
  }

  async function loginWithToken(getToken: () => Promise<string>) {
    requestPreprocessor = async (config) => {
      const token = await getToken()
      config.headers['Authorization'] = `Bearer ${token}`
      return config
    }
    const token = await getToken()
    authToken.value = token
    return await loadAllState()
  }

  async function logout() {
    requestPreprocessor = async (config) => config
    authToken.value = undefined
    return await loadAllState()
  }

  function setParseState(data: Record<string, unknown>) {
    parseState.value = data
  }

  return {
    // State
    allState, dateOverride, count, quoteConfig, balances,
    parseState, gainstrackText, quotes, conversion, user, authToken,
    // Getters
    isAuthenticated, allStateEx, accountIds, reloadCounter, tradeableAccounts,
    mainAssetAccounts, mainAccounts, findAccount, baseCcy, tradeFxConverter,
    customFxConverter, fxConverter, quoteDeps, allTxs, allPostings, allPostingsEx, allCcys,
    // Actions
    changeUser, computeBalances, loadMultiQuotes, loadQuotes, loadQuotesRaw,
    fetchGainstrackText, setGainstrackText, loadLocalText, setConversion, reload, loadAllState,
    setDateOverride, upsertAsset, login, loginWithToken, logout, setParseState
  }
})

export type AppStore = ReturnType<typeof useAppStore>
