import {LocalDate, SingleFXConversion, SingleFXConverter} from 'src/lib/fx';
import {AccountCommandDTO, AssetDTO} from 'src/lib/models';
import {intDateToIsoDate, Interpolator, linearInterpolateValue} from 'src/lib/SortedColumnMap';

type AssetId = string

interface Pricer {
  id: string
  label: string
  canPrice(asset:AssetDTO):boolean
  getPrice(asset:AssetDTO, tgtCcy: AssetId, date: LocalDate): number|undefined
  latestDate(asset: AssetDTO, tgtCcy: AssetId, date: LocalDate): string|undefined
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
  readonly marketFx: SingleFXConverter;
  readonly tradeFx: SingleFXConversion;

  readonly pricers: Pricer[] = [];

  constructor(allCommands: AccountCommandDTO[], allCcys:AssetId[], tradeFx: SingleFXConversion, marketFx: SingleFXConverter) {
    const definedAssets = allCommands.filter(cmd => cmd.commandType === 'commodity').map(commmodityCommandToAssetDTO);
    const moreAssets:AssetDTO[] = allCcys
      .filter(ccy => !definedAssets.find(a => a.asset === ccy))
      .map(ccy => {return {asset:ccy, options: {tags: []}}});
    this.assetCommands = [...definedAssets, ...moreAssets];
    this.baseCcy = marketFx.baseCcy;
    this.tradeFx = tradeFx;
    this.marketFx = marketFx;
    this.pricers = [
      new ProxyPricer(this.tradeFx, this.marketFx),
      new FXPricer(this.marketFx)
    ]
  }

  protected findAsset(asset: string) : AssetDTO|undefined {
    return this.assetCommands.find(a => a.asset === asset)
  }

  protected modelFor(asset: AssetDTO): Pricer | undefined {
    const pricer = this.pricers.find(pricer => pricer.canPrice(asset))
    return pricer;
  }

  modelForAssetId(assetId: AssetId): Pricer | undefined {
    const asset = this.findAsset(assetId);
    return asset ? this.modelFor(asset) : undefined;
  }

  getFX(fx1: string, fx2: string, date: string): number | undefined {
    const asset = this.findAsset(fx1);
    if (asset) {
      const pricer = this.modelFor(asset);
      return pricer?.getPrice(asset, fx2, date);
    }
  }

  latestDate(fx1: string, fx2: string, date: string): string | undefined {
    const asset = this.findAsset(fx1);
    if (asset) {
      const pricer = this.modelFor(asset);
      return pricer?.latestDate(asset, fx2, date);
    }
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

  canPrice(asset:AssetDTO) {
    // TODO: Or is an ISO symbol
    return asset.options.ticker !== undefined ||
      this.singleFXConverter.getFX(asset.asset, 'USD', '2099-01-01') !== undefined;

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


class ProxyPricer implements Pricer {
  id = 'proxy';
  label = 'Proxy';
  tradeFx: SingleFXConversion;
  marketFx: SingleFXConverter;

  constructor(tradeFx: SingleFXConversion, marketFx: SingleFXConverter) {
    this.tradeFx = tradeFx;
    this.marketFx = marketFx;
    // this.baseCcy = marketFx.baseCcy;
  }

  canPrice(asset:AssetDTO) {
    const proxy = asset.options.proxy;
    return proxy !== undefined && proxy !== '';
  }

  latestDate(asset:AssetDTO, fx2: string, date: string): string | undefined {
    if (!asset.options.proxy) throw new Error(`ProxyPricer used on asset ${asset.asset} without proxyTicker`)
    const proxyTicker = asset.options.proxy;

    if (proxyTicker) {
      return this.tradeFx.latestDate(proxyTicker, fx2, date)
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
