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
    change?: Amount
    balance?: Amount
    price?: Amount
    otherAccount?: string
    options?: Record<string, any>
    commandType?: string
    // TODO: Put this in options or make it official
    commission?: Amount
}

export interface StateSummaryDTO {
    baseCcy: string;
    accountIds: string[]
    accounts: AccountDTO[]
    ccys: string[]
    authentication: AuthenticationDTO
    commands: AccountCommandDTO[]
}

export interface AuthenticationDTO {
    username: string
}


export interface NetworthByAsset {
    assetId: string
    value: number
    price: number
    priceDate: string
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
