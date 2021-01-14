import {myAuth, myFirestore} from 'src/lib/myfirebase';
import firebase from 'firebase/app';
import CollectionReference = firebase.firestore.CollectionReference;
import Query = firebase.firestore.Query;
import FieldValue = firebase.firestore.FieldValue;

interface QuoteSourceProvider {
  sourceType: string
  ref: string
  meta: string
}

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

const quoteSourceDb = () => myFirestore().collection('quoteSources');
const quoteSourceHistoryDb = () => myFirestore().collection('quoteSourceHistory');

let allQuoteSources: QuoteSource[] | undefined = undefined;

export async function createQuoteSource(name: string): Promise<QuoteSource> {
  const doc = emptyQuoteSource(name)

  const ret = await quoteSourceDb().add(doc);
  const ref = await ret.get();
  const newDoc = ref.data() as QuoteSource;
  newDoc.id = ret.id;
  return newDoc;
}

export async function upsertQuoteSource(qsrc: QuoteSource): Promise<void> {
  const id = `${qsrc.ticker}.${qsrc.marketRegion}`;
  if (qsrc.id !== id) {
    throw new Error(`QuoteSource id must be ${id}`)
  }
  if (!qsrc.ticker || !qsrc.marketRegion) {
    // This is just a client side sanity check
    throw new Error('QuoteSource must have ticker and marketRegion')
  }


  const safeQsrc = prepareQuoteSourceForSave(qsrc);

  const data = {
    payload: safeQsrc,
    action: 'upsert',
    createTime: FieldValue.serverTimestamp(),
    uid: myAuth().currentUser?.uid,
  };
  await quoteSourceHistoryDb().add(data);

  // Update local cache without server side sync
  if (allQuoteSources) {
    const idx = allQuoteSources.findIndex(x => x.id === id);
    if (idx>=0) {
      allQuoteSources[idx] = safeQsrc
    } else {
      allQuoteSources = [...allQuoteSources, safeQsrc];
    }
  }
}

export async function getAllQuoteSources(filter?: (col:CollectionReference) => Query|CollectionReference): Promise<QuoteSource[]> {
  const dataRef = quoteSourceDb();
  const filteredRef = filter? filter(dataRef) : dataRef;

  const snapshot = await filteredRef.get();
  const ret:QuoteSource[] = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    data.id = doc.id;
    const qs = sanitiseQuoteSource(data);
    ret.push(qs);
  });
  allQuoteSources = ret;
  return ret;
}

function sanitiseQuoteSource(qs: any): QuoteSource {
  // TODO: Do a robust version of this function
  if (!qs.asset) qs.asset = {};
  if (!qs.providers && qs.sources) {
    // Version convert sources from array to map
    qs.providers = {};
    qs.sources.forEach((src:any) => {
      qs.providers[src.sourceType] = src
    })
  }

  // if (qs.ddd)
  return qs as QuoteSource
}

function prepareQuoteSourceForSave(qs: QuoteSource) {
  const providers:Record<string, any> = {}
  qs.sources.forEach(src => {
    if (src.sourceType) {
      providers[src.sourceType] = src
    }
  });
  return {...qs, providers};
}

export async function getQuoteSource(id: string): Promise<QuoteSource|undefined> {
  const all = await getAllQuoteSources();
  return all.find(x => x.id === id)
}

export async function getQuoteSourceHistory(id: string): Promise<QuoteSourceHistory[]> {
  const ref = quoteSourceHistoryDb()
    .where('payload.id', '==', id)
    .orderBy('payload.lastUpdate.timestamp', 'desc'); // orderBy createTime
  const snapshot = await ref.get()
  const ret:QuoteSourceHistory[] = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    data.id = doc.id;
    // const qsh = sanitiseQuoteSourceHistory(data);
    const qsh = data as QuoteSourceHistory
    ret.push(qsh);
  });
  return ret;
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
  const db = myFirestore();
  const snapshot = await db.collection('assets').get();
  const ret: AssetEntry[] = [];
  snapshot.forEach(doc => {
    const pSeries = doc.data() as AssetEntry;
    pSeries.id = doc.id;
    ret.push(pSeries as AssetEntry);
  });
  return ret;
}

