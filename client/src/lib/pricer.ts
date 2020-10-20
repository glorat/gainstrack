import {SingleFXConversion, SingleFXConverter} from '../lib/fx';
import {AccountCommandDTO, AssetDTO} from '../lib/models';
import {intDateToIsoDate, Interpolator, linearInterpolateValue} from '../lib/SortedColumnMap';
import {LocalDate} from '@js-joda/core';

type AssetId = string

interface Pricer {
  id: string
  label: string
  /** Quotes required for both canPrice and getPrice, so that they can be pre-loaded */
  quotesRequired(asset:AssetDTO): string[]
  canPrice(asset:AssetDTO):boolean
  getPrice(asset:AssetDTO, tgtCcy: AssetId, date: LocalDate): number|undefined
  latestDate(asset: AssetDTO, tgtCcy: AssetId, date: LocalDate): LocalDate|undefined
}

function commmodityCommandToAssetDTO(cmd: AccountCommandDTO) : AssetDTO {
  if (cmd.commandType === 'commodity') {
    // const tags: string[] = cmd.options && cmd.options['tags'] ? (<string[]>cmd.options['tags']) : [];
    // const ticker: string = (cmd.options && cmd.options['ticker']) ? <string>cmd.options['ticker'] : '';
    // const asset: string = cmd.options?.asset;
    // const options: AssetOptions = {
    //   ...cmd.options,
    //   tags,
    //   ticker,
    // };
    //
    // return {...cmd, asset, options }
    return <AssetDTO><unknown>cmd;
  } else {
    throw new Error('Command type is invalid')
  }
}

export class GlobalPricer implements SingleFXConverter {
  readonly baseCcy: string;
  readonly assetCommands: AssetDTO[];

  readonly pricers: Pricer[] = [];

  constructor(allCommands: AccountCommandDTO[], allCcys:AssetId[], readonly tradeFx: SingleFXConversion, readonly marketFx: SingleFXConverter) {
    const definedAssets = allCommands.filter(cmd => cmd.commandType === 'commodity').map(commmodityCommandToAssetDTO);
    const moreAssets:AssetDTO[] = allCcys
      .filter(ccy => !definedAssets.find(a => a.asset === ccy))
      .map(ccy => {return {asset:ccy, options: {tags: []}}});
    this.assetCommands = [...definedAssets, ...moreAssets];
    this.baseCcy = marketFx.baseCcy;
    this.pricers = [
      new ProxyPricer(this.tradeFx, this.marketFx),
      new FXPricer(this.marketFx),
      new BookPricer(this.tradeFx)
    ]
  }

  protected findAsset(asset: string) : AssetDTO|undefined {
    return this.assetCommands.find(a => a.asset === asset)
  }

  quotesRequired(asset:AssetDTO): Record<string, string[]> {
    return this.pricers.reduce(
      (prev, pricer) => {
        const qts = pricer.quotesRequired(asset);
        qts.forEach(qt => {
          if (!prev[qt]) prev[qt] = [];
          prev[qt].push(asset.asset);
        });
        return prev;
      }, {} as Record<string, string[]>);
  }

  protected modelFor(asset: AssetDTO): Pricer | undefined {
    const pricer = this.pricers.find(pricer => pricer.canPrice(asset))
    return pricer;
  }

  modelForAssetId(assetId: AssetId): Pricer | undefined {
    const asset = this.findAsset(assetId);
    return asset ? this.modelFor(asset) : undefined;
  }

  getFX(fx1: string, fx2: string, date: LocalDate): number | undefined {
    const asset = this.findAsset(fx1);
    if (asset) {
      const pricer = this.modelFor(asset);
      const price = pricer?.getPrice(asset, fx2, date);
      return price;
    }
  }

  getFXTrimmed(fx1: string, fx2: string, date: LocalDate): number | undefined {
   return GlobalPricer.trim(this.getFX(fx1, fx2, date))
  }

  latestDate(fx1: string, fx2: string, date: LocalDate): LocalDate | undefined {
    const asset = this.findAsset(fx1);
    if (asset) {
      const pricer = this.modelFor(asset);
      return pricer?.latestDate(asset, fx2, date);
    }
  }

  // Round off to 6dp, carefully dealing with some fp issues
  static trim(num: number|undefined): number|undefined {
    if (num === undefined) return undefined;
    return Math.round((num + Number.EPSILON) * 1000000) / 1000000
  }

}


class FXPricer implements Pricer {
  id = 'fx';
  label = 'Listed';
  baseCcy: AssetId;
  singleFXConverter: SingleFXConverter;

  constructor(singleFXConversion: SingleFXConverter) {
    this.singleFXConverter = singleFXConversion;
    this.baseCcy = singleFXConversion.baseCcy;
  }

  static isIso(ccy: string) {
    // A temporary shortcut until we load a proper list
    return ccy.length === 3;
  }

  quotesRequired(asset:AssetDTO): string[] {
    if (asset.options.ticker) {
      return [asset.options.ticker]
    } else if (FXPricer.isIso(asset.asset)) {
      return [asset.asset]
    } else {
      return [];
    }
  }

  canPrice(asset:AssetDTO) {
    // TODO: Or is an ISO symbol
    // const eligible = (!!asset.options.ticker) || (FXPricer.isIso(asset.asset));
    const tickerEligible = () => (!!asset.options.ticker) && (this.singleFXConverter.getFX(asset.options.ticker, this.baseCcy, LocalDate.MAX) !== undefined)
    const isoEligible = () => (FXPricer.isIso(asset.asset) && this.singleFXConverter.getFX(asset.asset, this.baseCcy, LocalDate.MAX) !== undefined)
    return tickerEligible() || isoEligible();

  }

  getPrice(asset:AssetDTO, fx2: AssetId, date: LocalDate): number|undefined {
    const fx1 = asset.asset;
    const cfx1 = asset.options.ticker || fx1;
    const cfx2 = fx2; // Assume target is unmapped
    const ret = this.singleFXConverter.getFX(cfx1, cfx2, date);
    return ret;
  }

  latestDate(asset:AssetDTO, fx2: AssetId, date: LocalDate): LocalDate|undefined {
    const fx1 = asset.asset;
    const cfx1 = asset.options.ticker || fx1;
    const cfx2 = fx2; // Assume target is unmapped
    return this.singleFXConverter.latestDate(cfx1, cfx2, date)
  }
}

class BookPricer implements Pricer {
  id = 'book';
  label = 'Book';
  baseCcy: string;

  constructor(readonly tradeFx: SingleFXConversion) {
    this.baseCcy = tradeFx.baseCcy;
  }

  quotesRequired(): string[] {
    return [];
  }

  canPrice(asset:AssetDTO) {
    // TODO: Or is an ISO symbol
    return this.tradeFx.getFX(asset.asset, this.baseCcy, LocalDate.now()) !== undefined;

  }

  getPrice(asset:AssetDTO, fx2: AssetId, date: LocalDate): number|undefined {
    const fx1 = asset.asset;
    const ret = this.tradeFx.getFX(fx1, fx2, date);
    return ret;
  }

  latestDate(asset:AssetDTO, fx2: AssetId, date: LocalDate): LocalDate|undefined {
    const fx1 = asset.asset;
    return this.tradeFx.latestDate(fx1, fx2, date)
  }
}

export class ProxyPricer implements Pricer {
  id = 'proxy';
  label = 'Proxy';

  constructor(readonly tradeFx: SingleFXConversion, readonly marketFx: SingleFXConverter) {
    // this.baseCcy = marketFx.baseCcy;
  }

  quotesRequired(asset:AssetDTO): string[] {
    if (asset.options.proxy) {
      return [asset.options.proxy]
    } else {
      return [];
    }
  }

  canPrice(asset:AssetDTO) {
    const proxy = asset.options.proxy;
    return proxy !== undefined
      && proxy !== ''
      && this.marketFx.getFX(proxy, this.marketFx.baseCcy, LocalDate.MAX) !== undefined;
  }

  latestDate(asset:AssetDTO, fx2: string, date: LocalDate): LocalDate | undefined {
    if (!asset.options.proxy) throw new Error(`ProxyPricer used on asset ${asset.asset} without proxyTicker`)
    const proxyTicker = asset.options.proxy;

    if (proxyTicker) {
      return this.marketFx.latestDate(proxyTicker, fx2, date)
    } else {
      return undefined
    }
  }


  getPrice(asset:AssetDTO, tgtCcy: AssetId, date: LocalDate): number|undefined {
    if (!asset.options.proxy) throw new Error(`ProxyPricer used on asset ${asset.asset} without proxyTicker`)
    const proxyTicker = asset.options.proxy;
    const fx1 = asset.asset;

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
          const marketBase = this.marketFx.getFX(proxyTicker, tgtCcy, intDateToIsoDate(lastDate) as LocalDate);
          const marketRef = this.marketFx.getFX(proxyTicker, tgtCcy, date);
          if (marketBase != 0.0 && marketRef && marketBase) {
            const proxyVal = lastTrade * (marketRef/marketBase);
            return proxyVal;
          } else {
            return lastTrade;
          }
        } else if (nearest.interpolate) {
          const int = nearest.interpolate;
          return linearInterpolateValue(int, key);
        }
      };

      return this.tradeFx.getFX(fx1, tgtCcy, date, proxyInterp)
    }
  }

}
