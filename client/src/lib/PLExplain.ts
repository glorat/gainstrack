import {LocalDate} from '@js-joda/core';

import {AccountCommandDTO, PostingEx} from 'src/lib/models';
import {
  isSubAccountOf,
  positionSetFx,
  positionUnderAccount,
  postingsToPositionSet
} from 'src/lib/utils';
import { keys, groupBy, sum, range } from 'lodash';
import {SingleFXConverter} from 'src/lib/fx';

export interface PLExplainDTO {
  fromDate: string, toDate: string
  toNetworth: number, networthChange: number
  actual: number, explained: number, unexplained: number
  newActivityPnl: number, newActivityByAccount: {accountId: string, explain: number}[]
  totalEquity: number
  totalIncome: number, totalYieldIncome: number
  totalExpense: number, totalDeltaExplain: number
  delta: any[]
  tenor?: string
}

export function pnlExplain(startDate: LocalDate, toDate: LocalDate, allPostings: PostingEx[],
                           allCmds: AccountCommandDTO[], baseCcy: string, fxConverter: SingleFXConverter): PLExplainDTO {
  const postings = allPostings.filter(p => isSubAccountOf(p.account, 'Assets')); // FIXME: +Liabilities
  const fromDate = startDate.minusDays(1) // So we do inclusivity of the startDate
  const toStartPostings = postings.filter(p => LocalDate.parse(p.date).isBefore(fromDate.plusDays(1)));
  const toEndPostings = postings.filter(p => LocalDate.parse(p.date).isBefore(toDate.plusDays(1)));

  const networthStart = postingsToPositionSet(toStartPostings);
  const totalNetworthEndPos = postingsToPositionSet(toEndPostings);

  const fromNetworth = positionSetFx(networthStart, baseCcy, fromDate, fxConverter)
  const toNetworth = positionSetFx(totalNetworthEndPos, baseCcy, toDate, fxConverter)
  // const actualPnlPosition = mergeWith(totalNetworthEndPos, networthStart, (objVal, srcVal) => objVal - srcVal)
  const actual = toNetworth - fromNetworth
  const ccyExplain = keys(networthStart);


  // Delta explain
  const delta = ccyExplain.map(assetId => {
    const oldPrice = fxConverter.getFX(assetId, baseCcy, fromDate)
    const newPrice = fxConverter.getFX(assetId, baseCcy, toDate)
    if (oldPrice && newPrice) {
      const amount = networthStart[assetId];
      const newValue = newPrice*amount;
      const oldValue = oldPrice*amount;
      const explain = newValue - oldValue;
      return {assetId, fromDate, toDate, oldPrice, newPrice, amount, oldValue, newValue, explain};
    }
  }).filter(x => x !== undefined && x.explain !== 0.0);
  const totalDeltaExplain = sum(delta.map(x => x?.explain ?? 0))

  // Activity
  // Beware the current inclusivity semantic again
  const duringPostings: PostingEx[] = allPostings.filter(p => {
    const dt = LocalDate.parse(p.date)
    return dt.isAfter(fromDate) && dt.isBefore(toDate.plusDays(1))
  })
  const activityPostingsByAccount = groupBy(duringPostings, p => allCmds[p.originIndex].description);
  const newActivityByAccount = Object.entries(activityPostingsByAccount).map(kv => {
    const accountId = kv[0];
    const explain = positionSetFx(postingsToPositionSet(kv[1]), baseCcy, toDate, fxConverter);
    return {accountId, explain};
  }).filter(x => x.explain !== 0.0)
  // mapValues(activityPostingsByAccount, (ps: PostingEx[]) => positionSetFx(postingsToPositionSet(ps), baseCcy, LocalDate.parse(ps[0].date), fxConverter))
  const newActivityPnl = sum(newActivityByAccount.map(x => x.explain))
  const equityPositionChange = positionUnderAccount(duringPostings, 'Equity')


  const yieldPostings = duringPostings.filter( p => {
    const tx = allCmds[p.originIndex]
    return tx.commandType === 'yield' && isSubAccountOf(p.account, 'Income')
  });
  const yieldIncomes = yieldPostings.map((p:PostingEx) => {
    return -positionSetFx(postingsToPositionSet([ p ]), baseCcy, LocalDate.parse(p.date), fxConverter)
  });
  const totalYieldIncome = sum(yieldIncomes)


  const totalEquity = -positionSetFx(equityPositionChange, baseCcy, toDate, fxConverter)
  const totalIncome =
    -positionSetFx(positionUnderAccount(duringPostings, 'Income'), baseCcy, toDate, fxConverter) - totalYieldIncome
  const totalExpense = positionSetFx(positionUnderAccount(duringPostings, 'Expenses'), baseCcy, toDate, fxConverter)

  const explained = totalDeltaExplain + newActivityPnl + totalEquity + totalIncome + totalYieldIncome - totalExpense
  const unexplained = actual - explained;
  // const toNetworth
  //   .map(p => {
  //   const pSet = postingsToPositionSet([p]);
  //   const foo = positionSetFx(pSet, baseCcy, fxConverter)
  // })

  const changeDenom = toNetworth - actual;
  const networthChange = changeDenom ? actual/changeDenom : 0;
  // Result
  // FIXME: fromDate, tenor
  return {toDate: toDate.toString(), fromDate: startDate.toString(),
    toNetworth, networthChange,
    actual, explained, unexplained,
    newActivityPnl, newActivityByAccount,
    totalEquity,
    totalIncome, totalYieldIncome,
    totalExpense, totalDeltaExplain,
    delta};
}


export function pnlExplainMonthly(baseDate:LocalDate, allPostings: PostingEx[], allCmds: AccountCommandDTO[], baseCcy: string,
                           fxConverter: SingleFXConverter): PLExplainDTO[] {
  const endDates = [baseDate, ...range(12).map(n => baseDate.minusMonths(n).withDayOfMonth(1).minusDays(1))]
  const startDates = endDates.map(dt => dt.withDayOfMonth(1));

  // Avoid loading the whole locales packages just for this
  // const monthFmt = DateTimeFormatter.ofPattern("MMM")
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const descs = startDates.map(dt => monthNames[dt.month().ordinal()]);

  const exps:PLExplainDTO[] = range(12).map( i=> {
    return {...pnlExplain(startDates[i], endDates[i], allPostings, allCmds, baseCcy, fxConverter), tenor: descs[i]}
  });
  const total = totalPnlExplain(exps);
  const avg = dividePnlExplain(total, exps.length);
  return [avg, total, ...exps];
}

function totalPnlExplain(exps: PLExplainDTO[]):PLExplainDTO {
  const toNetworth = exps[exps.length-1].toNetworth;
  const networthChange = sum(exps.map(e => e.actual))/toNetworth;
  return {
    fromDate: exps[exps.length-1].fromDate, toDate: exps[0].toDate,
    toNetworth: 0, //undefined
    networthChange,
    actual: sum(exps.map(e => e.actual)),
    explained: sum(exps.map(e => e.explained)),
    unexplained: sum(exps.map(e => e.unexplained)),
    newActivityPnl: sum(exps.map(e => e.newActivityPnl)),
    newActivityByAccount: [],
    totalEquity: sum(exps.map(e => e.totalEquity)),
    totalIncome: sum(exps.map(e => e.totalIncome)),
    totalYieldIncome: sum(exps.map(e => e.totalYieldIncome)),
    totalExpense: sum(exps.map(e => e.totalExpense)),
    totalDeltaExplain: sum(exps.map(e => e.totalDeltaExplain)),
    delta: [],
    tenor: 'total'
  }
}

function dividePnlExplain(p: PLExplainDTO, n: number):PLExplainDTO {
  return {
    ...p,
    actual: p.actual/n,
    networthChange: 0,
    explained: p.explained/n,
    unexplained: p.unexplained/n,
    newActivityPnl: p.newActivityPnl/n,
    totalEquity: p.totalEquity/n,
    totalYieldIncome: p.totalYieldIncome/n,
    totalIncome: p.totalIncome/n,
    totalExpense: p.totalExpense/n,
    totalDeltaExplain: p.totalDeltaExplain/n,
    delta: [], // not supported,
    tenor: 'avg', // that's why we do a division
  }
}
