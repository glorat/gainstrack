import numbro from 'numbro';
import {AccountCommandDTO, AccountDTO, Posting, Transaction} from 'src/lib/models';
import {LocalDate, SingleFXConverter} from 'src/lib/fx';
import {flatMap, groupBy, keys, sum, uniq, reduce, mergeWith, stubTrue} from 'lodash';

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
  filteredPostings: Posting[]
}

export interface CommandPostingsWithBalance extends CommandPostings {
  balance: Record<string, number>
  delta: Record<string, number>
}

export function postingsByCommand(txs: Transaction[], cmds: AccountCommandDTO[], postingFilter: (p:Posting)=>boolean = stubTrue): CommandPostings[] {
  const commandIndices = uniq(txs.map(tx => tx.originIndex));
  const rows = commandIndices.map(originIndex => {
    const cmd = cmds[originIndex];
    const myTxs = txs.filter(tx => tx.originIndex === originIndex);
    const postings = flatMap(myTxs, tx => tx.postings);
    const filteredPostings = postings.filter(postingFilter);
    return {originIndex, cmd, postings, filteredPostings};
  }).filter(row => row.filteredPostings.length > 0);
  return rows;
}

const numberMerger = (x:number|undefined,y:number|undefined) =>  (x||0) + (y||0);

export function commandPostingsWithBalance(commandPostings:CommandPostings[]): CommandPostingsWithBalance[] {
  const ret:CommandPostingsWithBalance[] = [];
  let balanceSoFar: Record<string, number> = {};
  commandPostings.forEach(cp => {
    const delta = postingsToPositionSet(cp.filteredPostings);
    balanceSoFar = mergeWith(balanceSoFar, delta, numberMerger);
    const balance = {...balanceSoFar};
    const r = {...cp, delta, balance};
    ret.push(r);
  });
  return ret;
}


export function postingsToPositionSet(ps: Posting[]) : Record<string, number> {
  // const posMerge = (a:Record<string, number>, b: Record<string, number>) => {
  const posMerge = (a:any, b: any) => {
    return mergeWith(a, b, numberMerger)
  };

  const poses = ps.map(p => {return {[p.value.ccy] : p.value.number}});
  const ret = reduce(poses, posMerge, {});
  return ret;
}

export function convertPositionSetTo(positions: Record<string, number>, baseCcy:string, date:LocalDate, fxConverter: SingleFXConverter) {
  const toCcy = keys(positions).map (ccy => positions[ccy] * (fxConverter.getFX(ccy, baseCcy, date)||0));
  return sum(toCcy);
}

export function displayConvertedPositionSet(pos: Record<string, number>, baseCcy: string, conversion: string, date: string, account: AccountDTO|undefined, fxConverter: SingleFXConverter) {
  if (conversion == 'units') {
    return keys(pos).map(ccy => `${pos[ccy].toFixed(2)} ${ccy}`).join(' ');
  } else {
    let ccy;
    if (conversion == 'global') {
      ccy = baseCcy
    } else if (conversion == 'parent' || !conversion) {
      ccy = account ? account.ccy : baseCcy
    } else {
      ccy = conversion;
    }
    return convertPositionSetTo(pos, ccy, date, fxConverter).toFixed(2) + ` ${ccy}`;
  }
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
