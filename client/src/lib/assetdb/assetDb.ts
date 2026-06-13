import { myAuth, myFirestore, myFunctions } from './myfirebase'
import {
  collection, doc, getDoc, getDocs, addDoc,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { uniq, pick } from 'lodash'

export interface LastUpdate {
  timestamp: number
  revision: number
}

export interface QuoteSource {
  id: string
  ticker: string
  marketRegion: string
  name: string
  exchange: string
  ccy: string
  sources: {sourceType: string, ref: string, meta: string}[] // deprecated
  providers: Record<string, {sourceType: string, ref: string, meta: string}>
  asset: Record<string, any>
  lastUpdate?: LastUpdate
}

export interface QuoteSourceHistory{
  id: string;
  createTime: any
  uid: string
  payload: QuoteSource
}

export function emptyQuoteSource(name:string): QuoteSource {
  return {
    id: '',
    name,
    ticker: '',
    marketRegion: '',
    exchange: '',
    ccy: 'USD',
    sources: [{sourceType: '', ref: '', meta: ''}],
    providers: {},
    asset: {}
  }
}

export const quoteSourceDb = () => collection(myFirestore(), 'quoteSources')
const quoteSourceHistoryDb = () => collection(myFirestore(), 'quoteSourceHistory')
const userRolesDb = () => collection(myFirestore(), 'userRoles')

let allQuoteSources: QuoteSource[] | undefined = undefined

const displayNameMap: Record<string, string|undefined> = {} // uid -> displayName
export async function getDisplayNames(uids: string[]): Promise<Record<string,(string|undefined)>> {
  const missing = uniq(uids.filter(uid => !displayNameMap[uid]))
  if (missing.length > 0) {
    const missingDocsPromises = missing.map(async m => (await getDoc(doc(myFirestore(), 'userRoles', m))).data())
    const missingDocs = await Promise.all(missingDocsPromises)
    missingDocs.forEach((docData, idx) => {
      displayNameMap[missing[idx]] = docData?.displayName
    })
  }
  return pick(displayNameMap, uids)
}

export async function getUserRole(uid: string) {
  const snap = await getDoc(doc(myFirestore(), 'userRoles', uid))
  return snap.data()
}

export async function setDisplayName(displayName: string) {
  const fn = httpsCallable(myFunctions(), 'setDisplayName')
  const result = await fn({ displayName })
  return result.data
}

export async function createQuoteSource(name: string): Promise<QuoteSource> {
  const qsrc = emptyQuoteSource(name)
  const docRef = await addDoc(quoteSourceDb(), qsrc)
  const snap = await getDoc(docRef)
  const newDoc = snap.data() as QuoteSource
  newDoc.id = docRef.id
  return newDoc
}

export async function upsertQuoteSource(qsrc: QuoteSource): Promise<void> {
  const id = `${qsrc.ticker}.${qsrc.marketRegion}`
  if (qsrc.id !== id) {
    throw new Error(`QuoteSource id must be ${id}`)
  }
  if (!qsrc.ticker || !qsrc.marketRegion) {
    throw new Error('QuoteSource must have ticker and marketRegion')
  }

  const safeQsrc = prepareQuoteSourceForSave(qsrc)

  const data = {
    payload: safeQsrc,
    action: 'upsert',
    createTime: serverTimestamp(),
    uid: myAuth().currentUser?.uid,
  }
  await addDoc(quoteSourceHistoryDb(), data)

  if (allQuoteSources) {
    const idx = allQuoteSources.findIndex(x => x.id === id)
    if (idx >= 0) {
      allQuoteSources[idx] = safeQsrc
    } else {
      allQuoteSources = [...allQuoteSources, safeQsrc]
    }
  }
}

export async function getAllQuoteSources(filter?: (col: ReturnType<typeof quoteSourceDb>) => ReturnType<typeof query>): Promise<QuoteSource[]> {
  const dataRef = quoteSourceDb()
  const filteredRef = filter ? filter(dataRef) : dataRef
  const snapshot = await getDocs(filteredRef)
  const ret: QuoteSource[] = []
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as Record<string, any>
    data.id = docSnap.id
    const qs = sanitiseQuoteSource(data)
    ret.push(qs)
  })
  if (!filter) allQuoteSources = ret
  return ret
}

export function sanitiseQuoteSource(qs: any): QuoteSource {
  if (!qs.asset) qs.asset = {}
  if (!qs.providers && qs.sources) {
    qs.providers = {}
    qs.sources.forEach((src:any) => {
      qs.providers[src.sourceType] = src
    })
  }
  return qs as QuoteSource
}

function prepareQuoteSourceForSave(qs: QuoteSource) {
  const providers:Record<string, any> = {};
  (qs.sources ?? []).forEach(src => {
    if (src.sourceType) {
      providers[src.sourceType] = src
    }
  })
  return {...qs, providers}
}

export async function getQuoteSourceHistory(id: string): Promise<QuoteSourceHistory[]> {
  const q = query(
    quoteSourceHistoryDb(),
    where('payload.id', '==', id),
    orderBy('createTime', 'desc')
  )
  const snapshot = await getDocs(q)
  const ret: QuoteSourceHistory[] = []
  snapshot.forEach(docSnap => {
    const data = docSnap.data()
    data.id = docSnap.id
    ret.push(data as QuoteSourceHistory)
  })
  return ret
}

export interface AssetEntry {
  id: string
  name?: string
  isin?: string
  sedol?: string
  sources: any
  ticker: string
  type: 'ETF' | 'Stock'
}

export async function getAllAssets(): Promise<AssetEntry[]> {
  const snapshot = await getDocs(collection(myFirestore(), 'assets'))
  const ret: AssetEntry[] = []
  snapshot.forEach(docSnap => {
    const pSeries = docSnap.data() as AssetEntry
    pSeries.id = docSnap.id
    ret.push(pSeries)
  })
  return ret
}
