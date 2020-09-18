import {LocalDate} from "@js-joda/core";
import {AllState, PostingEx} from "src/lib/models";
import {positionSetFx, postingsToPositionSet} from "src/lib/utils";
import { mergeWith, keys } from "lodash";
import {SingleFXConverter} from "src/lib/fx";

export function pnlExplain(startDate: LocalDate, toDate: LocalDate, postings: PostingEx[], baseCcy: string, fxConverter: SingleFXConverter) {
  const fromDate = startDate.minusDays(1) // So we do inclusivity of the startDate
  const toStartPostings = postings.filter(p => LocalDate.parse(p.date).isBefore(fromDate.plusDays(1)));
  const toEndPostings = postings.filter(p => LocalDate.parse(p.date).isBefore(toDate.plusDays(1)));
  const duringPostings = toEndPostings.filter(p => LocalDate.parse(p.date).isAfter(fromDate))
  const networthStart = postingsToPositionSet(toStartPostings);
  const totalNetworthEndPos = postingsToPositionSet(toEndPostings);

  const totalNetworthStart = positionSetFx(totalNetworthEndPos, baseCcy, toDate, fxConverter)
  const totalNetworthEnd = positionSetFx(networthStart, baseCcy, fromDate, fxConverter)
  // const actualPnlPosition = mergeWith(totalNetworthEndPos, networthStart, (objVal, srcVal) => objVal - srcVal)
  const actualPnl = totalNetworthStart - totalNetworthEnd
  const ccyExplain = keys(networthStart);

  // Delta explain
  const deltaExplain = ccyExplain.map(assetId => {
    const oldPrice = fxConverter.getFX(assetId, baseCcy, fromDate)
    const newPrice = fxConverter.getFX(assetId, baseCcy, toDate)
    if (oldPrice && newPrice) {
      const amount = networthStart[assetId];
      const newValue = newPrice*amount;
      const oldValue = oldPrice*amount;
      const explain = newValue - oldValue;
      return {assetId, fromDate, toDate, oldPrice, newPrice, amount, oldValue, newValue, explain};
    }
  }).filter(x => x !== undefined);
  const totalDeltaExplain = deltaExplain.map

  // Activity

  // Result
  return {deltaExplain};
}
