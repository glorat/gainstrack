import numbro from 'numbro';
import {Posting} from 'src/lib/models';
import {SingleFXConverter} from 'src/lib/fx';
import {groupBy, keys, sum} from 'lodash';

export function formatNumber(val: unknown) {
  return numbro(val).format({thousandSeparated: true, mantissa: 2});
}

export function isSubAccountOf(accountId: string, parentId: string): boolean {
  return (accountId === parentId) || (accountId.startsWith(parentId + ':'))
}

export function assetRowsFromPostings(myPostings: Posting[], fx: SingleFXConverter, valueCcy: string, today: string) {
  const byAsset: Record<string, Posting[]> = groupBy(myPostings, p => p.value.ccy);
  const assetRows: AssetRow[] = keys(byAsset).sort().map(key => {
    const ps = byAsset[key];
    const unitNumber = sum(ps.map(p => p.value.number));
    const unitCcy = ps[0].value.ccy;
    const price = fx.getFX(unitCcy, valueCcy, today);
    const valueNumber = (price || 0.0) * unitNumber;
    const priceDate = fx.latestDate(unitCcy, valueCcy, today);
    return {unitNumber, unitCcy, valueNumber, valueCcy, price, priceDate};
  });
  return assetRows;
}

export interface AssetRow {
  unitNumber: number
  unitCcy: string
  valueNumber: number
  valueCcy: string
  price?: number
  priceDate?: string
}
