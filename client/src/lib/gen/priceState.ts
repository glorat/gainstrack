// Price accumulation, ported from `PriceState.scala`. Builds the per-pair price time-series
// (both directions per observation) and the currency set. Produces `AllState.priceState`.

import Decimal from 'decimal.js';
import { PriceState as DTOPriceState } from 'src/lib/assetdb/models';
import { GAccountState } from 'src/lib/gen/accountState';
import { GCommand } from 'src/lib/gen/commands';
import { D, GAmount } from 'src/lib/gen/money';
import { commandToTransfers, isCommandNeedsAccounts } from 'src/lib/gen/transfer';

export class GPriceState {
  readonly ccys = new Set<string>();
  // pair "X/Y" -> (isoDate -> rate)
  readonly prices = new Map<string, Map<string, Decimal>>();

  private set(pair: string, date: string, value: Decimal): void {
    let m = this.prices.get(pair);
    if (!m) { m = new Map(); this.prices.set(pair, m); }
    m.set(date, value);
  }

  private withNewPrice(date: string, price: GAmount, tgt: string): void {
    if (tgt === price.ccy) throw new Error(`requirement failed: ${tgt} == ${price.ccy}`);
    this.set(`${tgt}/${price.ccy}`, date, price.number);
    this.set(`${price.ccy}/${tgt}`, date, D(1).div(price.number));
    this.ccys.add(tgt);
    this.ccys.add(price.ccy);
  }

  private handle(cmd: GCommand, acct: GAccountState): void {
    switch (cmd.kind) {
      case 'price': this.withNewPrice(cmd.date, cmd.price, cmd.assetId); return;
      case 'trade': this.withNewPrice(cmd.date, cmd.price, cmd.security.ccy); return;
      case 'unit': this.withNewPrice(cmd.date, cmd.price, cmd.security.ccy); return;
      default:
        if (isCommandNeedsAccounts(cmd)) {
          for (const t of commandToTransfers(cmd, acct.lookup)) {
            if (t.sourceValue.ccy !== t.targetValue.ccy) {
              const price = new GAmount(t.sourceValue.number.div(t.targetValue.number), t.sourceValue.ccy);
              this.withNewPrice(t.date, price, t.targetValue.ccy);
            }
          }
        }
    }
  }

  // returns sorted [date, value] for a pair (Scala SortedMap is date-ordered)
  sortedSeries(pair: string): Array<[string, Decimal]> {
    const m = this.prices.get(pair);
    if (!m) return [];
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  }

  toDTO(): DTOPriceState {
    const prices: Record<string, Record<string, number>> = {};
    for (const pair of this.prices.keys()) {
      const series: Record<string, number> = {};
      for (const [d, v] of this.sortedSeries(pair)) series[d] = v.toNumber();
      prices[pair] = series;
    }
    return { ccys: [...this.ccys], prices };
  }

  static build(commands: GCommand[], acct: GAccountState): GPriceState {
    const ps = new GPriceState();
    for (const cmd of commands) ps.handle(cmd, acct);
    return ps;
  }
}
