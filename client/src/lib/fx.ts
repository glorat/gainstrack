import {TimeSeries} from '../store';
import {mapValues, uniq} from 'lodash';
import {
  intDateToIsoDate,
  Interpolator,
  isoToIntDate,
  linear,
  linearInterpolateValue,
  SortedColumnMap
} from 'src/lib/SortedColumnMap';

type AssetId = string
export type LocalDate = string

interface FXConverter {
  getFX(fx1:AssetId, fx2:AssetId, date:LocalDate): number|undefined
  latestDate(fx1: AssetId, fx2: AssetId, date: LocalDate): LocalDate|undefined
}

export interface SingleFXConverter extends FXConverter {
  baseCcy: AssetId
}

export class FXMarketLazyLoad implements SingleFXConverter {
  baseCcy: AssetId;
  marketFx: SingleFXConversion;
  ccys: AssetId[] = [];
  lazyLoad: (ccy:AssetId) => Promise<void>;

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

  latestDate( /*fx1: string, fx2: string, date: string*/ ): string | undefined {
    throw new Error('Not implemented');
    // return undefined;
  }
}

export class SingleFXConversion implements SingleFXConverter {
  state: Record<string, SortedColumnMap> = {};
  baseCcy: string;

  constructor(state: Record<string, SortedColumnMap>, baseCcy: string) {
    this.state = state;
    this.baseCcy = baseCcy
  }

  static fromQuotes(quotes: Record<string, TimeSeries>, baseCcy?: string) {
    const state = mapValues(quotes, (ts: TimeSeries) => new SortedColumnMap(ts.x.map(isoToIntDate), ts.y));
    return new SingleFXConversion(state, baseCcy || 'USD');
  }

  static fromDTO(quotes: Record<string, {ks:string[], vs:number[]}>, baseCcy: string) {
    const state = mapValues(quotes, x => new SortedColumnMap(x.ks.map(isoToIntDate), x.vs));
    return new SingleFXConversion(state, baseCcy || 'USD');
  }

  static empty() {
    return new SingleFXConversion({}, 'USD');
  }

  getFX(fx1: AssetId, fx2: AssetId, localDate: LocalDate, interp?: Interpolator): number | undefined {
    const date = isoToIntDate(localDate);
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
      const fxval1 = this.getFX(fx1, this.baseCcy, localDate);
      if (fxval1) {
        const fxval2 = this.getFX(fx2, this.baseCcy, localDate);
        if (fxval2) {
          return fxval1 / fxval2;
        }

      }
    }
  }

  latestDate(fx1: string, fx2: string, date: string): string | undefined {
    const intDate = isoToIntDate(date);
    const series = this.state[fx1];
    if (series) {
      return intDateToIsoDate(series.latestKey(intDate))
    } else {
      return undefined;
    }
  }
}

export class FXMapped implements SingleFXConverter{
  baseCcy: AssetId;
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
    const ret = this.singleFXConverter.getFX(cfx1, cfx2, date);
    return ret;
  }

  latestDate(fx1: AssetId, fx2: AssetId, date: LocalDate): LocalDate|undefined {
    const cfx1 = this.mapper[fx1] || fx1;
    const cfx2 = this.mapper[fx2] || fx2;
    return this.singleFXConverter.latestDate(cfx1, cfx2, date)
  }
}

export class FXProxy implements FXConverter {
  baseCcy: string;
  mapper: Record<AssetId, AssetId>;
  tradeFx: SingleFXConversion;
  marketFx: SingleFXConverter;

  constructor(mapper: Record<AssetId, AssetId>, tradeFx: SingleFXConversion, marketFx: SingleFXConverter) {
    this.mapper = mapper;
    this.tradeFx = tradeFx;
    this.marketFx = marketFx;
    this.baseCcy = marketFx.baseCcy;
  }

  latestDate(fx1: string, fx2: string, date: string): string | undefined {
    const proxyTicker = this.mapper[fx1];
    if (proxyTicker) {
      return this.tradeFx.latestDate(proxyTicker, fx2, date)
    } else {
      return undefined
    }
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
          const marketBase = this.marketFx.getFX(proxyTicker, fx2, intDateToIsoDate(lastDate) as LocalDate);
          const marketRef = this.marketFx.getFX(proxyTicker, fx2, date);
          if (marketBase != 0.0 && marketRef && marketBase) {
            const proxyVal = lastTrade * (marketRef/marketBase);
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
  fxConverters: SingleFXConverter[];
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

  latestDate(fx1: string, fx2: string, date: string): string | undefined {
    for (const conv of this.fxConverters) {
      if (!conv.latestDate) {debugger;}
      const ret = conv.latestDate(fx1, fx2, date);
      if (ret) {
        return ret;
      }
    }
    return undefined;
  }

}
