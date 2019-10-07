export interface AccountCreation {
    date: string;
    key: AccountKey;
    options: AccountOptions;
}

export interface AccountKey {
    name: string;
    assetId: string;
}

export interface AccountOptions {
    tradingAccount: boolean;
}

export interface Fraction {
    n: bigint;
    d: bigint;
}

export interface Balance {
    value: Fraction;
    ccy: string;
}
