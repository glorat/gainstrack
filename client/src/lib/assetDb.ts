import {myFirestore} from 'src/lib/myfirebase';

export interface QuoteSource {
  id: string
  ticker: string
  marketRegion: string
  name: string
  exchange: string
  ccy: string
  sources: {sourceType: string, ref: string}[]
}

export function emptyQuoteSource(name:string): QuoteSource {
  return {
    id: '',
    name,
    ticker: '',
    marketRegion: '',
    exchange: '',
    ccy: 'USD',
    sources: []
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
    const pSeries = doc.data() as QuoteSource;
    pSeries.id = doc.id;
    ret.push(pSeries as QuoteSource);
  });
  allQuoteSources = ret;
  return ret;
}

export async function getQuoteSource(id: string): Promise<QuoteSource|undefined> {
  const all = await getAllQuoteSources();
  return all.find(x => x.id === id)
}


export interface AssetEntry {
  id: string
  name?: string
  exchange?: string
  isin?: string
  refs?: string[]
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

// https://en.wikipedia.org/wiki/List_of_stock_exchanges
const stockExchanges = [
  {acronym: 'NYSE', name: 'New York Stock Exchange', region: 'United States', city: 'New York'},
  {acronym: 'LSE', name: 'London Stock Exchange', region: 'United Kingdom', mic: 'XLON', city: 'London'},
  {acronym: 'NASDAQ', name: 'Nasdaq', region: 'United States', city: 'New York'},
  {acronym: 'JPX', name: 'Japan Exchange Group', region: 'Japan', mic: 'XJPX', city: 'Tokyo'},
  {acronym: 'SSE', name: 'Shanghai Stock Exchange', region: 'China', city: 'Shanghai'},
  {acronym: 'SEHK', name: 'Hong Kong Stock Exchange', region: 'Hong Kong'},
  {acronym: '', name: 'Euronext', region: 'European Union', mic: 'XPAR', city: 'Paris'},
]

export const marketRegions = [
  {value: 'LN', description: 'London'},
  {value: 'SH', description: 'Shanghai'},
  {value: 'EU', description: 'European Cities'},
  {value: 'NY', description: 'New York'},
  {value: 'TK', description: 'Tokyo'},
  {value: 'HK', description: 'Hong Kong'},
]

export const quoteSourceTypes = [
  {value: 'av', description: 'Alpha Vantage ticker'},
  {value: 'investpy', description: 'investpy name'},
]
