import {LocalDate} from "@js-joda/core";
import {AccountCommandDTO, AllState, PostingEx, Transaction} from "src/lib/models";
import {
  convertedPositionSet,
  isSubAccountOf,
  positionSetFx,
  positionUnderAccount,
  postingsToPositionSet
} from "src/lib/utils";
import { mergeWith, keys, groupBy, mapValues, values, sum } from "lodash";
import {SingleFXConverter} from "src/lib/fx";

export function pnlExplain(startDate: LocalDate, toDate: LocalDate, allPostings: PostingEx[], allCmds: AccountCommandDTO[], baseCcy: string, fxConverter: SingleFXConverter) {
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

  const networthChange = toNetworth - fromNetworth
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
