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

export function simpleEnumEntry(value: string):EnumEntry {
  return cleanUp({value})
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
  {value: 'IND', label: 'Global Index'},
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
  {value: 'ft', label: 'ft.com symbol'},
  {value: 'yahoo', label: 'Yahoo finance symbol'},
].map(cleanUp);

export const investmentAssetTypes = [
  {value: 'Stock', label: 'Stock'},
  {value: 'ETF', label: 'ETF', description: 'Exchange Trade Fund (ETF)'},
  {value: 'Fund', label: 'Mutual Fund / OEIC'},
  {value: 'Index', label: 'Index', description: 'Index or Benchmark'},
].map(cleanUp);

export const assetCategories = [
  {value: 'Investment', description: 'Stocks, ETFs and other intangible assets'},
  {value: 'Real Estate', description: 'Real estate, homes, land, buildings'},
  {value: 'Property', description: 'Tangible things you own like houses, cars'},
  {value: 'Cash', description: 'Cash or equivalent deposited in an account'},
].map(cleanUp);

export const assetClass = [
  {value: 'Fixed Income', description: 'Bonds etc'},
  {value: 'Equity'},
  {value: 'Commodity'},
  {value: 'Real Estate'},
  {value: 'Multi-Asset'},
  {value: 'Alternatives'},
].map(cleanUp);

export const fixedIncomeTypes = [
  {value: 'Government'},
  {value: 'Inflation', label: 'Inflation Linked'},
  {value: 'Corporate'},
  {value: 'Investment', label: 'Investment Grade'},
  {value: 'Junk'},
].map(cleanUp);

export const equityCapSizes = [
  {value: 'Small', label: 'Small Cap'},
  {value: 'MidSmall', label: 'Mid/Small Cap'},
  {value: 'Mid', label: 'Mid Cap'},
  {value: 'LargeMid', label: 'Large/Mid Cap'},
  {value: 'Large', label: 'Large Cap'},
  {value: 'All', label: 'All Cap'},
].map(cleanUp);

export const issuerBrand = [
  {value: 'Vanguard'},
  {value: 'iShares', description:'ETFs managed by BlackRock'},
  {value: 'SPDR', label: 'State Street SPDR', description: 'ETFs managed by State Street'},
  {value: 'Invesco'},
  {value: 'Schwab'},
  {value: 'HSBC'},
  {value: 'L&G', label: 'Legal & General'},
  {value: 'Fidelity'},
];

export const fundManagement = [
  {value: 'Passive', description: 'Passively managed fund'},
  {value: 'Active', description: 'Actively managed fund'}
].map(cleanUp);

export const incomeTreatment = [
  {value: 'Accumulation', description: 'Dividends or income reinvested back into fund'},
  {value: 'Distribution', description: 'Dividends paid out as cash'}
].map(cleanUp);

export const geography = [
  {value: 'UK'},
  {value: 'Global'},
  {value: 'North America'},
  {value: 'Asia Pacific'},
  {value: 'Asia Pacific Excluding Japan'},
  {value: 'Japan'},
  {value: 'China/Greater China'},
  {value: 'Europe Excluding UK'},
  {value: 'Europe'},
  {value: 'US'},
  {value: 'Global Excluding US'},
  {value: 'Global Excluding UK'},
  {value: 'Developed World'},
  {value: 'Emerging Markets'},
].map(cleanUp);

export const whereOps:EnumEntry[] = [
  {value: '==', description: 'Equals', meta: 'EQ'},
  {value: '<=', description: 'Greater or equals', meta: 'LE'},
  {value: '>=', description: 'Less or equals', meta: 'GE'},
  {value: '<', description: 'Less than', meta: 'LT'},
  {value: '>', description: 'Greater than', meta: 'GT'},
].map(cleanUp)
