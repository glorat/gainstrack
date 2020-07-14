import numbro from 'numbro';
import {AccountCommandDTO, Posting, Transaction} from 'src/lib/models';
import {SingleFXConverter} from 'src/lib/fx';
import {flatMap, groupBy, keys, sum, uniq, reduce, mergeWith} from 'lodash';

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

interface CommandPostings {
  originIndex:number
  cmd:AccountCommandDTO
  postings:Posting[]
}

export function postingsByCommand(txs: Transaction[], cmds: AccountCommandDTO[]): CommandPostings[] {
  const commandIndices = uniq(txs.map(tx => tx.originIndex)).reverse();
  const rows = commandIndices.map(originIndex => {
    const cmd = cmds[originIndex];
    const myTxs = txs.filter(tx => tx.originIndex === originIndex);
    const postings = flatMap(myTxs, tx => tx.postings);
    return {originIndex, cmd, postings};
  });
  return rows;
}

export function postingsToPositionSet(ps: Posting[]) : Record<string, number> {
  // const posMerge = (a:Record<string, number>, b: Record<string, number>) => {
  const posMerge = (a:any, b: any) => {
    return mergeWith(a, b, (x,y) =>  (x||0) + (y||0))
  };

  const poses = ps.map(p => {return {[p.value.ccy] : p.value.number}});
  const ret = reduce(poses, posMerge, {});
  return ret;
}

export function journalEntries(mktConvert: SingleFXConverter, txs: Transaction[], cmds: AccountCommandDTO[], baseCcy: string): AccountTxDTO[] {

  const rows = postingsByCommand(txs, cmds).map(row => {
    const {cmd, postings} = row;
    const pnlPostings = postings.filter(p => p.account.match('^(Assets|Liabilities)'));
    const txPnl = sum(pnlPostings.map(posting => {
      // FIXME: pull date from tx.date in case some BalAdj is off by one? or myTxs[0].date?
      const fx = mktConvert.getFX(posting.value.ccy, baseCcy, cmd.date) || 0.0;
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
