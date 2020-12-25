import {myFirestore} from 'src/lib/myfirebase';

export interface QuoteSource {
  id: string
  ticker: string
  marketRegion: string
  name: string
  exchange: string
  ccy: string
  sources: {sourceType: string, ref: string, meta: string}[]
  asset: Record<string, any>
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
    asset: {}
  }
}

const quoteSourceDb = () => myFirestore().collection('quoteSources');
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

  // One day this should be a cloud function or cloud run handler to perform validation first
  await quoteSourceDb().doc(id).set(qsrc);

  // Update local cache without server side sync
  if (allQuoteSources) {
    const idx = allQuoteSources.findIndex(x => x.id === id);
    if (idx>=0) {
      allQuoteSources[idx] = qsrc
    } else {
      allQuoteSources = [...allQuoteSources, qsrc];
    }
  }
}

export async function getAllQuoteSources(): Promise<QuoteSource[]> {
  if (allQuoteSources) return allQuoteSources;

  const snapshot = await quoteSourceDb().get();
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
  return qs as QuoteSource
}

export async function getQuoteSource(id: string): Promise<QuoteSource|undefined> {
  const all = await getAllQuoteSources();
  return all.find(x => x.id === id)
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

