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
    balance?: Amount
    price?: Amount
    otherAccount?: string
    options?: object
    commandType?: string
}

export interface StateSummaryDTO {
    accountIds: string[]
    accounts: AccountDTO[]
    ccys: string[]
    authentication: object
    commands: AccountCommandDTO[]
}
