export interface AccountCreation {
    date: string;
    key: AccountKey;
    options: AccountOptions;
}

export interface AccountDTO {
    date: string
    accountId: string
    ccy: string
    options: AccountOptions
}

export interface AccountKey {
    name: string;
    assetId: string;
}

export interface AccountOptions {
    tradingAccount: boolean
    fundingAccount: string
    autoReinvestment: boolean
    multiAsset: boolean
    generatedAccount: boolean
}

export interface Amount {
    number: number
    ccy: string
}

export interface AmountEditing {
  number: number|undefined
  ccy: string|undefined
}

export interface QuoteConfig {
    avSymbol: string
    actualCcy: string
}

export interface AccountDTO {
    accountId: string
    date: string
    ccy: string
}

export interface AccountCommandDTO {
    accountId: string
    date: string
    asset?: string
    change?: Amount
    balance?: Amount
    price?: Amount
    otherAccount?: string
    options?: Record<string, any>
    commandType?: string
    // TODO: Put this in options or make it official
    commission?: Amount
  description?: string
}

export interface AccountCommandEditing {
  accountId: string // TODO: Make this defaultable too one day?
  date?: string
  asset?: string
  change?: AmountEditing
  balance?: AmountEditing
  price?: AmountEditing
  otherAccount?: string
  options?: Record<string, any>
  commandType?: string
  // TODO: Put this in options or make it official
  commission?: AmountEditing
  description?: string
}


export interface AuthenticationDTO {
    username: string
}


export interface NetworthByAsset {
    assetId: string
    value: number
    units: number
    price: number
    priceDate?: string
    priceMoves: Record<string, number>
}

export interface AssetColumn {
    name: string,
    label: string | number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    field: string | ((row: any) => any)
    classes?: string[]
    align?: string
    sortable?: boolean
    format?: (val: number) => string
    tag?: string
    value?: string
}

export interface AssetResponse {
    rows: NetworthByAsset[]
    columns: Array<Record<string, any>>
    totals: NetworthByAsset[]
}

export interface Posting {
  account: string
  value: Amount
  price?: Amount
}

/** Denormalised posting view that includes Tx data*/
export interface PostingEx extends Posting {
  date: string
  originIndex: number
}

export interface HasPostings {
  postings: Posting[]
}

export interface Transaction extends HasPostings {
    originIndex: number
    id: number
    postDate: string
    postings: Posting[]
}



export interface AccountState {
    accounts: AccountCommandDTO[]
    baseCurrency: string
}

export interface AssetOptions extends Record<string, any> {
    tags: string[]
    ticker?: string
    proxy?: string
}

export interface AssetDTO {
    // date: string,
    asset: string,
    options: AssetOptions
}

export interface BalanceStateSeries {
    series: Record<string, number>
    ccy: string
}

type LocalDate = string

export interface PriceState {
    ccys: string[]
    // key: assetPair
    prices: Record<string, Record<LocalDate, number>>
}

export interface StateSummaryDTO {
  baseCcy: string;
  accounts: AccountDTO[]
  ccys: string[]
  authentication: AuthenticationDTO
  commands: AccountCommandDTO[]
  customToken?: string
}

export interface AllState extends StateSummaryDTO {
  accounts: AccountDTO[]
  commands: AccountCommandDTO[]
  assetState: AssetDTO[]
  balances: Record<string, BalanceStateSeries>
  txs: (Transaction | AccountCommandDTO)[]
  priceState: PriceState
  tradeFx: { baseCcy: string, data: Record<string, { ks: string[], vs: number[] }> }
  fxMapper: Record<string, string>,
  proxyMapper: Record<string, string>,
}

export const emptyAllState: AllState = {
  accounts: [],
  authentication: {username: ''},
  baseCcy: '', ccys: [],
  commands: [],
  assetState: [],
  balances: {},
  txs: [],
  priceState: {ccys:[], prices:{} },
  tradeFx: {baseCcy: 'USD', data:{}},
  fxMapper: {},
  proxyMapper:{}
};

export interface TreeTableDTO {
  name: string
  shortName: string
  children: TreeTableDTO[]
  assetBalance: { ccy: string, number: number }[]
}

export function isTransaction(tx: AccountCommandDTO|Transaction):tx is Transaction {
  return (tx as Transaction).postings !== undefined;
}
