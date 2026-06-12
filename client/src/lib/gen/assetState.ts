// Asset metadata accumulation, ported from `AssetState.scala`. Records `commodity` metadata and
// auto-creates placeholders for every asset/currency mentioned. Produces `AllState.assetState`.

import { AccountCommandDTO } from 'src/lib/assetdb/models';
import { GCommand } from 'src/lib/gen/commands';

const PLACEHOLDER_DATE = '1900-01-01';

function placeholder(asset: string): AccountCommandDTO {
  return {
    accountId: '', date: PLACEHOLDER_DATE, asset,
    options: { name: '', ticker: '', tags: [] },
    commandType: 'commodity', description: asset,
  };
}

export class GAssetState {
  readonly allAssets = new Map<string, AccountCommandDTO>();

  private handleDefault(assetId?: string): void {
    if (!assetId) return;
    if (!this.allAssets.has(assetId)) this.allAssets.set(assetId, placeholder(assetId));
  }

  private handle(cmd: GCommand): void {
    switch (cmd.kind) {
      case 'commodity':
        // a real commodity overrides any placeholder
        this.allAssets.set(cmd.asset, {
          accountId: '', date: cmd.date, asset: cmd.asset,
          options: cmd.options, commandType: 'commodity', description: cmd.asset,
        });
        return;
      case 'open': this.handleDefault(cmd.assetId); return;
      case 'trade': this.handleDefault(cmd.security.ccy); return;
      case 'unit': this.handleDefault(cmd.security.ccy); return;
      // handleGeneric: toPartialDTO's asset / balance.ccy / change.ccy
      case 'price': this.handleDefault(cmd.assetId); return;
      case 'earn': case 'spend': case 'fund': this.handleDefault(cmd.kind === 'fund' ? cmd.change.ccy : cmd.value.ccy); return;
      case 'tfr': this.handleDefault(cmd.sourceValue.ccy); return;
      case 'yield': this.handleDefault(cmd.asset); this.handleDefault(cmd.value.ccy); return;
      case 'adj': case 'bal': this.handleDefault(cmd.balance.ccy); return;
      default: return;
    }
  }

  toDTO(): AccountCommandDTO[] {
    return [...this.allAssets.values()];
  }

  static build(commands: GCommand[]): GAssetState {
    const as = new GAssetState();
    for (const cmd of commands) as.handle(cmd);
    return as;
  }
}

export function buildFxMappers(assetState: GAssetState): { fxMapper: Record<string, string>; proxyMapper: Record<string, string> } {
  const fxMapper: Record<string, string> = {};
  const proxyMapper: Record<string, string> = {};
  for (const [asset, dto] of assetState.allAssets) {
    const opts = (dto.options ?? {}) as Record<string, unknown>;
    if (typeof opts.ticker === 'string' && opts.ticker) fxMapper[asset] = opts.ticker;
    if (typeof opts.proxy === 'string' && opts.proxy) proxyMapper[asset] = opts.proxy;
  }
  return { fxMapper, proxyMapper };
}
