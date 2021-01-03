export interface EnumEntry {
  value: string
  label: string
  description: string
}

function cleanUp(row:any):EnumEntry {
  if (!row.value) throw new Error('EnumEntry defined without a value');
  if (!row.label) {row.label = row.value}
  if (!row.description) {row.description = row.label}

  return row;
}

// https://en.wikipedia.org/wiki/List_of_stock_exchanges
// const stockExchanges = [
//   {acronym: 'NYSE', name: 'New York Stock Exchange', region: 'United States', city: 'New York'},
//   {acronym: 'LSE', name: 'London Stock Exchange', region: 'United Kingdom', mic: 'XLON', city: 'London'},
//   {acronym: 'NASDAQ', name: 'Nasdaq', region: 'United States', city: 'New York'},
//   {acronym: 'JPX', name: 'Japan Exchange Group', region: 'Japan', mic: 'XJPX', city: 'Tokyo'},
//   {acronym: 'SSE', name: 'Shanghai Stock Exchange', region: 'China', city: 'Shanghai'},
//   {acronym: 'SEHK', name: 'Hong Kong Stock Exchange', region: 'Hong Kong'},
//   {acronym: '', name: 'Euronext', region: 'European Union', mic: 'XPAR', city: 'Paris'},
// ];

export const marketRegions = [
  {value: 'GLOBAL', label: 'Global Market'},
  {value: 'LN', label: 'London'},
  {value: 'SH', label: 'Shanghai'},
  {value: 'EU', label: 'European Cities'},
  {value: 'NY', label: 'New York'},
  {value: 'TK', label: 'Tokyo'},
  {value: 'HK', label: 'Hong Kong'},
  {value: 'SG', label: 'Singapore'},
  {value: 'CA', label: 'Canada'},
].map(cleanUp);

export const quoteSourceTypes = [
  {value: 'av', label: 'Alpha Vantage'},
  {value: 'investpy', label: 'investpy'},
].map(cleanUp);

export const investmentAssetTypes = [
  {value: 'stock', label: 'Stock'},
  {value: 'etf', label: 'ETF', description: 'Exchange Trade Fund (ETF)'},
  {value: 'fund', label: 'Mutual Fund'},
  {value: 'index', label: 'Index', description: 'Index or Benchmark'},
].map(cleanUp);

export const assetCategories = [
  {value: 'investment', label: 'Investment', description: 'Stocks, ETFs and other intangible assets'},
  {value: 'realestate', label: 'Real Estate', description: 'Real estate, homes, land, buildings'},
  {value: 'property', label: 'Property', description: 'Tangible things you own like houses, cars'},
  {value: 'cash', label: 'Cash', description: 'Cash or equivalent deposited in an account'},
].map(cleanUp);

export const fundManagement = [
  {value: 'passive', label: 'Passive', description: 'Passively managed fund'},
  {value: 'active', label: 'Active', description: 'Actively managed fund'}
].map(cleanUp);

export const incomeTreatment = [
  {value: 'accumulation', label: 'Accumulation', description: 'Dividends or income reinvested back into fund'},
  {value: 'distribution', label: 'Distribution', description: 'Dividends paid out as cash'}
].map(cleanUp);
