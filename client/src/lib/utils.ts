import numbro from 'numbro';
import {AccountCommandDTO, Posting, Transaction} from 'src/lib/models';
import {SingleFXConverter} from 'src/lib/fx';
import {flatMap, groupBy, keys, sum, uniq} from 'lodash';

export function formatNumber(val: unknown) {
  return numbro(val).format({thousandSeparated: true, mantissa: 2});
}

export function formatPerc(val: unknown) {
  return numbro(val).format({output: 'percent', mantissa: 1});
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

export interface AccountTxDTO {
  date: string,
  cmdType: string,
  description: string,
  change: string,
  postings: Posting[]
}

export function journalEntries(mktConvert: SingleFXConverter, txs: Transaction[], cmds: AccountCommandDTO[], baseCcy: string): AccountTxDTO[] {
  const commandIndices = uniq(txs.map(tx => tx.originIndex)).reverse();

  const rows = commandIndices.map(idx => {
    const cmd = cmds[idx];
    const myTxs = txs.filter(tx => tx.originIndex === idx);
    const postings = flatMap(myTxs, tx => tx.postings);
    const pnlPostings = postings.filter(p => p.account.match('^(Assets|Liabilities)'));
    const txPnl = sum(pnlPostings.map(posting => {
      const fx = mktConvert.getFX(posting.value.ccy, baseCcy, posting.postDate) || 0.0;
      return fx * posting.value.number;
    }));

    return {
      date: cmd.date,
      cmdType: cmd.commandType || '',
      description: cmd.description || '',
      change: formatNumber(txPnl),
      postings
    };
  });
  return rows;
}

export interface AssetRow {
  unitNumber: number
  unitCcy: string
  valueNumber: number
  valueCcy: string
  price?: number
  priceDate?: string
}
