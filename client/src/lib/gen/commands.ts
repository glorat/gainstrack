// Typed command model for the generator, reconstructed from the parser's typed output
// (`Parsed`). Mirrors the Scala `AccountCommand` case classes but with decimal `GAmount`.

import { Amount as DTOAmount } from 'src/lib/assetdb/models';
import { Parsed, Kind } from 'src/lib/GainstrackParser';
import { GAmount } from 'src/lib/gen/money';

// Fields are guaranteed present per command kind by the parser (validated upstream).

export interface GAccountOptions {
  tradingAccount: boolean;
  description: string;
  multiAsset: boolean;
  automaticReinvestment: boolean;
  generatedAccount: boolean;
  hidden: boolean;
  placeholder: boolean;
  expenseAccount?: string;
  incomeAccount?: string;
  fundingAccount?: string;
}

export interface OpenCmd { kind: 'open'; date: string; accountId: string; assetId: string; options: GAccountOptions; }
export interface EarnCmd { kind: 'earn'; date: string; accountId: string; value: GAmount; target?: string; }
export interface SpendCmd { kind: 'spend'; date: string; accountId: string; value: GAmount; other?: string; }
export interface TfrCmd { kind: 'tfr'; date: string; source: string; dest: string; sourceValue: GAmount; targetValue: GAmount; }
export interface TradeCmd { kind: 'trade'; date: string; accountId: string; security: GAmount; price: GAmount; commission: GAmount; }
export interface AdjCmd { kind: 'adj'; date: string; accountId: string; balance: GAmount; adjAccount: string; }
export interface BalCmd { kind: 'bal'; date: string; accountId: string; balance: GAmount; adjAccount: string; }
export interface PriceCmd { kind: 'price'; date: string; assetId: string; price: GAmount; }
export interface UnitCmd { kind: 'unit'; date: string; accountId: string; security: GAmount; price: GAmount; }
export interface FundCmd { kind: 'fund'; date: string; accountId: string; change: GAmount; source?: string; }
export interface YieldCmd { kind: 'yield'; date: string; accountId: string; asset?: string; value: GAmount; target?: string; }
export interface CommodityCmd { kind: 'commodity'; date: string; asset: string; options: Record<string, unknown>; }
export interface GlobalCmd { kind: 'global'; operatingCurrency: string; }

export type GCommand =
  | OpenCmd | EarnCmd | SpendCmd | TfrCmd | TradeCmd | AdjCmd | BalCmd
  | PriceCmd | UnitCmd | FundCmd | YieldCmd | CommodityCmd | GlobalCmd;

function amt(a: DTOAmount): GAmount {
  return GAmount.of(a.number, a.ccy);
}

/** Reconstruct a typed GCommand from one parser `Parsed`. */
function toGCommand(p: Parsed): GCommand {
  const d = p.dto;
  const kind: Kind = p.kind;
  switch (kind) {
    case 'open':
      return { kind, date: d.date, accountId: d.accountId, assetId: d.balance!.ccy, options: d.options as unknown as GAccountOptions };
    case 'earn':
      return { kind, date: d.date, accountId: d.accountId, value: amt(d.change!), target: d.otherAccount };
    case 'spend':
      return { kind, date: d.date, accountId: d.accountId, value: amt(d.change!), other: d.otherAccount };
    case 'tfr':
      return { kind, date: d.date, source: d.accountId, dest: d.otherAccount!, sourceValue: amt(d.change!), targetValue: amt(p.tfrTarget!) };
    case 'trade':
      return { kind, date: d.date, accountId: d.accountId, security: amt(d.change!), price: amt(d.price!), commission: amt(d.commission!) };
    case 'adj':
      return { kind, date: d.date, accountId: d.accountId, balance: amt(d.balance!), adjAccount: d.otherAccount! };
    case 'bal':
      return { kind, date: d.date, accountId: d.accountId, balance: amt(d.balance!), adjAccount: d.otherAccount! };
    case 'price':
      return { kind, date: d.date, assetId: d.asset!, price: amt(d.price!) };
    case 'unit':
      return { kind, date: d.date, accountId: d.accountId, security: amt(d.balance!), price: amt(d.price!) };
    case 'fund':
      return { kind, date: d.date, accountId: d.accountId, change: amt(d.change!), source: d.otherAccount };
    case 'yield':
      return { kind, date: d.date, accountId: d.accountId, asset: d.asset, value: amt(d.change!), target: d.otherAccount };
    case 'commodity':
      return { kind, date: d.date, asset: d.asset!, options: d.options as Record<string, unknown> };
    case 'global':
      return { kind, operatingCurrency: (d.options as { operatingCurrency: string }).operatingCurrency };
  }
}

export function buildCommands(parsed: Parsed[]): GCommand[] {
  return parsed.map(toGCommand);
}
