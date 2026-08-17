import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SingleFXConversion, SingleFXConverter } from '../lib/fx'
import axios, { InternalAxiosRequestConfig } from 'axios'
import {
  AccountDTO,
  AllState, AssetDTO,
  emptyAllState,
  ParseError,
  PostingEx,
  TimeSeries,
  Transaction
} from '../lib/assetdb/models'
import { GlobalPricer } from '../lib/pricer'
import { AllStateEx } from '../lib/AllStateEx'
import { generateAllStateSafe } from '../lib/gen/GainstrackGenerator'
import { fetchLedgerRecords, loadLedgerText } from '../lib/ledger/firestoreLedger'
import { appendDelta, diffToDelta, upsertCommodityBlocks } from '../lib/ledger/append'
import { CommandBlock, replayLedger } from '../lib/ledger/replay'
import { BASE_GAINSTRACK, baseLedgerBlocks } from '../lib/ledger/baseLedger'
import { GainstrackParser } from '../lib/GainstrackParser'
import { toCommandBlocks } from '../lib/toGainstrack'
import { includes, keys, mergeWith } from 'lodash'
import { sectionTrees, SectionTrees } from '../lib/statements/sectionTrees'
import { LocalDate } from '@js-joda/core'
import { toCommodityGainstrack } from '../lib/commandDefaulting'
import { QuoteSource } from 'src/lib/assetdb/assetDb'
import { User } from 'firebase/auth'
import { Notify } from 'quasar'

// Re-exported for existing callers; the definition now lives in the pure DTO module so the FX
// layer can import it without pulling in this store.
export type { TimeSeries } from '../lib/assetdb/models'

// The five statement-root trees the balance-sheet and income-statement pages render. Shape and
// composition now live in lib/statements/sectionTrees so the browser and the headless CLI share one
// definition (including the pre-close rule); kept as `AccountBalances` here for existing callers.
export type AccountBalances = SectionTrees

type FXConverterWrapper = (fx: SingleFXConversion) => SingleFXConverter

export const useAppStore = defineStore('app', () => {
  // Axios interceptors (set up once when store is first used)
  let requestPreprocessor = async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => config

  axios.interceptors.request.use(
    config => requestPreprocessor(config),
    error => Promise.reject(error)
  )

  axios.interceptors.response.use(res => res, function (error) {
    if (error.response?.status === 401) {
      if (error.request.responseURL.startsWith(window.location.origin)) {
        Notify.create({ message: 'Please log out and in again!', type: 'negative' })
      }
    }
    return Promise.reject(error)
  })

  // State
  const allState = ref<AllState>(emptyAllState)
  const dateOverride = ref<LocalDate | undefined>(undefined)
  const count = ref(0)
  const quoteConfig = ref<QuoteSource[]>([])
  const balances = ref<AccountBalances>({})
  const parseState = ref<{ errors: ParseError[] }>({ errors: [] })
  const gainstrackText = ref('')
  const quotes = ref<Record<string, TimeSeries>>({})
  const conversion = ref('parent')
  const user = ref<User | undefined>(undefined)
  const authToken = ref<string | undefined>(undefined)

  // Getters
  const isAuthenticated = computed(() => !!authToken.value)
  /**
   * The uid whose Firestore ledger we may read and write, or undefined.
   *
   * Anonymous users are client-side only: they compute state in the browser via `loadLocalText`
   * and never persist. Firebase anonymous sign-in would still produce a uid, so it is excluded
   * explicitly rather than relying on there being no `signInAnonymously` call today.
   */
  const ledgerUid = computed(() =>
    user.value && !user.value.isAnonymous ? user.value.uid : undefined)
  /** Whether saving is possible at all — false for anonymous and signed-out users. */
  const canPersist = computed(() => !!ledgerUid.value)
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
      const result = sectionTrees(allStateEx.value, today, conversion.value, fxConverter.value)
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
    if (gainstrackText.value) return gainstrackText.value

    // The ledger replay IS the source text. (The old /api/editor/ returned text REGENERATED
    // from commands and regrouped by account, so this is also more faithful to what was written.)
    if (!ledgerUid.value) return ''
    const { text } = await loadLedgerText(ledgerUid.value)
    gainstrackText.value = text
    return text
  }

  function setGainstrackText(text: string) {
    gainstrackText.value = text
  }

  async function loadLocalText(text: string) {
    const { state, errors } = generateAllStateSafe(text)
    if (!state) return { ok: false, errors }
    allState.value = state
    balances.value = {}
    // Anonymous users have no server-side source; cache the just-computed text
    // so re-entering the editor restores it instead of fetching /api/editor/.
    gainstrackText.value = text
    parseState.value = { errors: [] }
    count.value++
    // Quotes are still served by the backend; a quote outage must not stop state from loading.
    await loadMultiQuotes(keys(quoteDeps.value)).catch(err => console.warn('Pre-load quotes failed:', err))
    await computeBalances()
    return { ok: true, errors: [], accounts: state.accounts.length, txs: state.txs.length, baseCcy: state.baseCcy }
  }

  async function setConversion(c: string) {
    conversion.value = c
    balances.value = {}
    await computeBalances()
  }

  async function reload() {
    const response = await loadAllState()
    // Both layouts await this on mount, so an unguarded failure here white-screens the app —
    // including the anonymous path, which otherwise needs no server at all. Quotes are the last
    // remaining server dependency and must degrade, not block: `quoteConfig` only feeds ticker
    // pickers and the Quotes table, all of which render empty quite happily.
    await axios.get('/api/quotes/config')
      .then(res => { quoteConfig.value = res.data })
      .catch(err => console.warn('Quote config load failed:', err))
    return response
  }

  /**
   * Load portfolio state. Signed-in users replay their Firestore ledger; everyone else gets the
   * sample ledger to explore locally, mirroring the server's `if (isAuthenticated) bgFromFile
   * .getOrElse(bgDefault) else bgDefault`. Anonymous state is never persisted.
   *
   * There is deliberately NO fallback to /api/allState: it reads the legacy Scala-side stream,
   * so falling back would silently show stale data and then fork the two stores on next save.
   * A Firestore failure must surface as a failure.
   */
  async function loadAllState() {
    if (ledgerUid.value) return await loadFromFirestore()
    return await loadLocalText(BASE_GAINSTRACK)
  }

  /**
   * Read the signed-in user's ledger event stream from Firestore, replay it to gainstrack text,
   * and generate AllState in the browser — no /api/allState, no Scala.
   *
   * The TS pipeline is verified byte-identical to the Scala one over a real ledger
   * (client/src/lib/__tests__/localGoldens.spec.ts), so the resulting AllState matches what the
   * server would have returned.
   */
  async function loadFromFirestore() {
    const uid = ledgerUid.value
    if (!uid) throw new Error('Cannot read ledger: anonymous and signed-out users do not persist')

    const { text, ledgerId, replay } = await loadLedgerText(uid)
    const { discardedRevisions, foreignStreamIds, unparseableEvents } = replay.diagnostics
    if (discardedRevisions.length || foreignStreamIds.length || unparseableEvents) {
      // The server truncates silently at a revision gap; at least make it visible here.
      console.warn(`Ledger ${ledgerId} replay anomalies:`, replay.diagnostics)
    }

    const { state, errors } = generateAllStateSafe(text, { username: user.value?.email ?? '' })
    if (!state) {
      parseState.value = { errors }
      throw new Error(`Ledger ${ledgerId} failed to generate: ${errors[0]?.message ?? 'unknown'}`)
    }

    allState.value = state
    balances.value = {}
    gainstrackText.value = text
    parseState.value = { errors: [] }
    count.value++
    await loadMultiQuotes(keys(quoteDeps.value)).catch(err => console.warn('Pre-load quotes failed:', err))
    await computeBalances()
    return { data: state }
  }

  /**
   * Current ledger contents plus the revision they sit at, for an optimistic-concurrency write.
   *
   * Refuses to write to a stream with a revision gap: the server silently truncates at the first
   * gap, so appending past one produces events nobody will ever replay. Better to fail loudly.
   */
  async function readLedgerForWrite() {
    const ledgerId = ledgerUid.value
    if (!ledgerId) throw new Error('Cannot write ledger: anonymous and signed-out users do not persist')

    const replay = replayLedger(await fetchLedgerRecords(ledgerId))
    if (replay.diagnostics.discardedRevisions.length > 0) {
      throw new Error(
        `Ledger ${ledgerId} has a revision gap (discarded ${replay.diagnostics.discardedRevisions.join(', ')}); refusing to write`,
      )
    }
    // `current` is what is actually PERSISTED — the diff and revision must be computed against
    // it. `effective` additionally seeds the starter ledger for an empty stream: those commands
    // exist for generation purposes but have never been written, so they must appear in `desired`
    // and therefore get persisted by the first save (mirroring the server, whose first
    // `saveGainstrack` starts from `defaultBase` and commits it).
    const current = replay.commands
    const effective = current.length === 0 ? baseLedgerBlocks() : current
    // Revisions are contiguous from 1, so the accepted count IS the head revision.
    return { ledgerId, current, effective, head: replay.diagnostics.revisionCount }
  }

  /** Refuse to persist anything that will not generate — the ledger must stay loadable. */
  function assertGenerates(blocks: CommandBlock[]) {
    const { state, errors } = generateAllStateSafe(blocks.flat().join('\n') + '\n')
    if (!state) throw new Error(`Would not generate: ${errors[0]?.message ?? 'unknown error'}`)
  }

  /** Replace the whole ledger with `text` (the editor's save, and Port's import). */
  async function saveLedgerSource(text: string) {
    const parser = new GainstrackParser()
    parser.parseString(text) // throws on parse errors, before anything is written
    const desired = toCommandBlocks(parser.getTypedCommands())
    assertGenerates(desired)

    const { ledgerId, current, head } = await readLedgerForWrite()
    const delta = diffToDelta(current, desired)
    if (delta) await appendDelta(ledgerId, delta, { expectedHead: head })
    await loadFromFirestore()
    return { changed: delta !== null }
  }

  /** Append one or more new commands (the add-command form). */
  async function addLedgerCommand(str: string) {
    const parser = new GainstrackParser()
    parser.parseString(str)
    const blocks = toCommandBlocks(parser.getTypedCommands())

    const { ledgerId, current, effective, head } = await readLedgerForWrite()
    const existing = new Set(effective.map(c => JSON.stringify(c)))
    if (blocks.some(b => existing.has(JSON.stringify(b)))) {
      throw new Error('Command already exists, no duplicates allowed')
    }
    const desired = [...effective, ...blocks]
    assertGenerates(desired)

    const delta = diffToDelta(current, desired)
    if (delta) await appendDelta(ledgerId, delta, { expectedHead: head })
    await loadFromFirestore()
    return blocks.length
  }

  /** Save the editor's source to the user's ledger. */
  async function saveSource(text: string) {
    await saveLedgerSource(text)
    return { errors: [] as ParseError[] }
  }

  /** Append a command to the user's ledger. */
  async function addCommand(str: string) {
    const added = await addLedgerCommand(str)
    return { errors: [] as ParseError[], added }
  }

  async function setDateOverride(d: string) {
    dateOverride.value = LocalDate.parse(d)
    balances.value = {}
    await computeBalances()
  }

  /**
   * Upsert an asset declaration from its gainstrack text. Commodity commands are declared once
   * per asset, so this REPLACES any existing declaration rather than appending a duplicate.
   */
  async function upsertAssetCommand(str: string) {
    const parser = new GainstrackParser()
    parser.parseString(str)
    const incoming = toCommandBlocks(parser.getTypedCommands())

    const { ledgerId, current, effective, head } = await readLedgerForWrite()
    const desired = upsertCommodityBlocks(effective, incoming)
    assertGenerates(desired)

    const delta = diffToDelta(current, desired)
    if (delta) await appendDelta(ledgerId, delta, { expectedHead: head })
    await loadFromFirestore()
    return { data: 'ok' }
  }

  async function upsertAsset(asset: AssetDTO) {
    return await upsertAssetCommand(toCommodityGainstrack(asset))
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

  function setParseState(data: { errors: ParseError[] }) {
    parseState.value = data
  }

  return {
    // State
    allState, dateOverride, count, quoteConfig, balances,
    parseState, gainstrackText, quotes, conversion, user, authToken,
    // Getters
    isAuthenticated, allStateEx, accountIds, reloadCounter, tradeableAccounts,
    mainAssetAccounts, mainAccounts, findAccount, baseCcy, tradeFxConverter, ledgerUid, canPersist,
    customFxConverter, fxConverter, quoteDeps, allTxs, allPostings, allPostingsEx, allCcys,
    // Actions
    changeUser, computeBalances, loadMultiQuotes, loadQuotes, loadQuotesRaw,
    fetchGainstrackText, setGainstrackText, loadLocalText, setConversion, reload, loadAllState,
    loadFromFirestore, saveSource, addCommand, saveLedgerSource, addLedgerCommand,
    setDateOverride, upsertAsset, upsertAssetCommand, loginWithToken, logout, setParseState
  }
})

export type AppStore = ReturnType<typeof useAppStore>
