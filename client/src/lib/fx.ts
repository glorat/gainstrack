import { TimeSeries } from '@/store';

import differenceInDays from 'date-fns/differenceInDays';

interface InterpolationOption {
  empty?: boolean
  exact? :number
  low?: number
  high?:number
  interpolate?: {before:{k:LocalDate, v:number}, after: {k:LocalDate, v:number}}
}

export function fromISO(dt?: LocalDate): Date|undefined {
  const s = dt ? dt.split(/\D/).map(x => parseInt(x)) : [];
  if (s[0] && s[1] && s[2]) {
    return new Date(+s[0], --s[1], +s[2],  0, 0, 0, 0)
  } else {
    return undefined
  }
}

function linearInterpolateValue(int: { before: { k: LocalDate; v: number }; after: { k: LocalDate; v: number } }, key: string) {
  const beforeDate = fromISO(int.before.k);
  const afterDate = fromISO(int.after.k);
  const keyDate = fromISO(key);
  if (keyDate && beforeDate && afterDate) {
    const all = differenceInDays(beforeDate, afterDate);
    const n = differenceInDays(beforeDate, keyDate);
    const ratio = n / all;
    const diff = int.after.v - int.before.v;
    const ret = (diff * ratio) + int.before.v;
    return ret;
  } else {
    debugger; // Badly formatted date?
    return undefined;
  }
}

type Interpolator = (nearest: InterpolationOption, key: LocalDate) => number|undefined;
const linear:Interpolator = (nearest: InterpolationOption, key: LocalDate) => {
  if (nearest.empty) {
    return undefined;
  } else if (nearest.exact) {
    return nearest.exact
  } else if (nearest.low) {
    return nearest.low
  } else if (nearest.high) {
    return nearest.high
  } else if (nearest.interpolate) {
    const int = nearest.interpolate;
    return linearInterpolateValue(int, key);
  }
}

class SortedColumnMap {
  ks: string[];
  vs: number[];

  constructor(ks: string[], vs: number[]) {
    this.ks = ks;
    this.vs = vs;
  }

  iota(key: string): number {
    return this.ks.findIndex(k => key < k);
  }

  getNearest(key: string): InterpolationOption {
    if (this.ks.length == 0) {
      return {empty: true};
    } else {
      const idx = this.iota(key);
      if (idx<0) {
        return {high: this.vs[this.vs.length - 1]}
      } else if (this.ks[idx] == key) {
        return {exact: this.vs[idx]}
      } else if (idx == 0) {
        return {low: this.vs[0]}
      } else {
        return {interpolate: {before:{k: this.ks[idx-1], v: this.vs[idx-1]}, after: {k: this.ks[idx], v: this.vs[idx]}}}
      }
    }
  }

}

type AssetId = string
type LocalDate = string

import { mapValues, uniq } from 'lodash';

interface FXConverter {
  getFX(fx1:AssetId, fx2:AssetId, date:LocalDate): number|undefined
  // latestDate(fx1: AssetId, fx2: AssetId, date: LocalDate): LocalDate|undefined
}


export interface SingleFXConverter extends FXConverter {
  baseCcy: AssetId
}

export class FXMarketLazyLoad implements SingleFXConverter {
  baseCcy: AssetId;
  marketFx: SingleFXConversion;
  ccys: AssetId[] = []
  lazyLoad: (ccy:AssetId) => Promise<void>

  constructor(marketFx: SingleFXConversion, lazyLoad: (ccy:AssetId)=>Promise<void>) {
    this.marketFx = marketFx;
    this.lazyLoad = lazyLoad;
    this.baseCcy = marketFx.baseCcy;
  }

  allCcys() {
    return uniq(this.ccys);
  }

  getFX(fx1:AssetId, fx2:AssetId, date:LocalDate): number|undefined {
    if (!this.marketFx.state[fx1]) {
      this.lazyLoad(fx1)
    }
    if (!this.marketFx.state[fx2]) {
      this.lazyLoad(fx2)
    }
    return this.marketFx.getFX(fx1, fx2, date);
  }
}

export class SingleFXConversion {
  state: Record<string, SortedColumnMap> = {};
  baseCcy: string;

  constructor(state: Record<string, SortedColumnMap>, baseCcy: string) {
    this.state = state;
    this.baseCcy = baseCcy
  }

  static fromQuotes(quotes: Record<string, TimeSeries>, baseCcy?: string) {
    const state = mapValues(quotes, (ts: TimeSeries) => new SortedColumnMap(ts.x, ts.y));
    return new SingleFXConversion(state, baseCcy || 'USD');
  }

  static fromDTO(quotes: Record<string, {ks:string[], vs:number[]}>, baseCcy: string) {
    const state = mapValues(quotes, x => new SortedColumnMap(x.ks, x.vs))
    return new SingleFXConversion(state, baseCcy || 'USD');
  }

  static empty() {
    return new SingleFXConversion({}, 'USD');
  }

  getFX(fx1: AssetId, fx2: AssetId, date: LocalDate, interp?: Interpolator): number | undefined {
    interp = interp || linear;

    if (fx1 == fx2) {
      return 1.0;
    } else if (fx2 == this.baseCcy) {
      const series = this.state[fx1];
      if (series) {
        const nearest = series.getNearest(date);
        if (nearest) {
          return interp(nearest, date)
        }
      }
    } else {
      const fxval1 = this.getFX(fx1, this.baseCcy, date);
      if (fxval1) {
        const fxval2 = this.getFX(fx2, this.baseCcy, date);
        if (fxval2) {
          return fxval1 / fxval2;
        }

      }
    }
  }
}

export class FXMapped implements SingleFXConverter{
  baseCcy: AssetId
  mapper: Record<AssetId, AssetId>;
  singleFXConverter: SingleFXConverter;

  constructor(mapper: Record<AssetId, AssetId>, singleFXConversion: SingleFXConverter) {
    this.mapper = mapper;
    this.singleFXConverter = singleFXConversion;
    this.baseCcy = singleFXConversion.baseCcy;
  }

  getFX(fx1: AssetId, fx2: AssetId, date: LocalDate): number|undefined {
    const cfx1 = this.mapper[fx1] || fx1;
    const cfx2 = this.mapper[fx2] || fx2;
    const ret = this.singleFXConverter.getFX(cfx1, cfx2, date)
    return ret;
  }

  // latestDate(fx1: AssetId, fx2: AssetId, date: LocalDate): LocalDate|undefined {
  //   const cfx1 = this.mapper[fx1] || fx1;
  //   const cfx2 = this.mapper[fx2] || fx2;
  //   return this.singleFXConverter.latestDate(cfx1, cfx2, date)
  // }
}

export class FXProxy {
  baseCcy: string
  mapper: Record<AssetId, AssetId>
  tradeFx: SingleFXConversion
  marketFx: SingleFXConverter

  constructor(mapper: Record<AssetId, AssetId>, tradeFx: SingleFXConversion, marketFx: SingleFXConverter) {
    this.mapper = mapper;
    this.tradeFx = tradeFx;
    this.marketFx = marketFx;
    this.baseCcy = marketFx.baseCcy;
  }


  getFX(fx1: AssetId, fx2: AssetId, date: LocalDate): number|undefined {
    const proxyTicker = this.mapper[fx1];
    if (proxyTicker) {
      const proxyInterp: Interpolator = (nearest, key) => {
        if (nearest.empty) {
          return undefined;
        } else if (nearest.exact) {
          return nearest.exact
        } else if (nearest.low) {
          return nearest.low
        } else if (nearest.high) {
          // Extrapolate from market
          const lastEntry = this.tradeFx.state[fx1];
          const lastDate = lastEntry.ks[lastEntry.ks.length-1];
          const lastTrade = lastEntry.vs[lastEntry.vs.length-1];
          const marketBase = this.marketFx.getFX(proxyTicker, fx2, lastDate);
          const marketRef = this.marketFx.getFX(proxyTicker, fx2, date);
          if (marketBase != 0.0 && marketRef && marketBase) {
            const proxyVal = lastTrade * (marketRef/marketBase)
            return proxyVal;
          }
        } else if (nearest.interpolate) {
          const int = nearest.interpolate;
          return linearInterpolateValue(int, key);
        }
      };

      return this.tradeFx.getFX(fx1, fx2, date, proxyInterp)
    }
  }
}

export class FXChain implements SingleFXConverter {
  baseCcy: AssetId;
  fxConverters: SingleFXConverter[]
  constructor(fxConverters: SingleFXConverter[]) {
    this.fxConverters = fxConverters;
    this.baseCcy = fxConverters[0].baseCcy;
  }

  getFX(fx1: AssetId, fx2:AssetId, date: LocalDate): number|undefined {
    for (const conv of this.fxConverters) {
      const ret = conv.getFX(fx1, fx2, date);
      if (ret) {
        return ret;
      }
    }
    return undefined;
  }

}
