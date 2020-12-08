import {myFirestore} from 'src/lib/myfirebase';

export interface QuoteSource {
  id?: string
  name: string
  exchange: string
  ccy: string
  sources: {sourceType: string, ref: string}[]
}

function emptyQuoteSource(name:string) {
  return {
    name,
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
