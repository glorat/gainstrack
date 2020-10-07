import {SingleFXConverter} from 'src/lib/fx';
import {LocalDate} from '@js-joda/core';
import {maxBy} from 'lodash';
import {AssetResponse} from "src/lib/models";

function assetReportRows(pSet: Record<string, number>, pricer: SingleFXConverter, baseCcy: string, date: LocalDate) {
  const rows = Object.entries(pSet).map(([assetId, units]) => {
    const price = pricer.getFX(assetId, baseCcy, date) ?? 0;
    const value = price * units;
    const priceDate = pricer.latestDate(assetId, baseCcy, date)?.toString();
    const priceMoves = {} as Record<string, number>;
    return {
      assetId, units, value, price, priceDate, priceMoves
    }
  });
  return rows;
}

export function assetReport(pSet: Record<string, number> , pricer: SingleFXConverter, baseCcy: string, date: LocalDate): AssetResponse{
  // Compute our report
  const rows = assetReportRows(pSet, pricer, baseCcy, date);

  const allDates: string[] = rows.map(row => row.priceDate ?? LocalDate.MIN).filter(x => x !== LocalDate.MIN) as string[];

  if (allDates.length > 0) {
    let columns: any[] = [];
    let baseDate = '';
    const maxDate = maxBy(allDates, dt => dt) as string;
    // const cutOff = sub(maxDate, {days: 4});
    // const recentDts = allDates.filter(dt => isAfter(dt, cutOff))
    // const bestDate:Date = maxBy(Object.entries(groupBy(recentDts)), x => x[1].length)[0]
    // console.error(bestDate);
    // It just isn't as concise outside of Scala to get a most common element!
    const bestDate = LocalDate.parse(maxDate)

    baseDate = bestDate.toString();

    const dates = [
      bestDate.minusDays(1),
      bestDate.minusWeeks(1),
      bestDate.minusMonths(1),
      bestDate.minusMonths(3),
      bestDate.minusYears(1),
      bestDate.withDayOfYear(1)
    ];
    columns = [
      {
        'name': '1d', 'label': '1d', 'value': dates[0], 'tag': 'priceMove'
      }, {
        'name': '1w',
        'label': '1w',
        'value': dates[1],
        'tag': 'priceMove'
      }, {'name': '1m', 'label': '1m', 'value': dates[2], 'tag': 'priceMove'}, {
        'name': '3m',
        'label': '3m',
        'value': dates[3],
        'tag': 'priceMove'
      }, {'name': '1y', 'label': '1y', 'value': dates[4], 'tag': 'priceMove'}, {
        'name': 'YTD',
        'label': 'YTD',
        'value': dates[5],
        'tag': 'priceMove'
      }];


    // withPriceMoves
    rows.forEach(row => {
      const priceMoves: Record<string, number> = {};
      columns.forEach(col => {
        const basePrice = pricer.getFX(row.assetId, baseCcy, bestDate);
        const datePrice = pricer.getFX(row.assetId, baseCcy, col.value)
        // console.error(`${row.assetId} ${col.label} ${basePrice} -> ${datePrice}`);
        if (basePrice && datePrice && basePrice !== 0.0) {
          priceMoves[col.name] = (basePrice - datePrice) / datePrice;
        }
      })
      row.priceMoves = priceMoves;
    });
    const totalValue = rows.map(row => row.value).reduce((a, b) => a + b);
    const totals = [{assetId: 'TOTAL', value: totalValue, price: 0, priceDate: baseDate, priceMoves: {}, units: 0}];
    const assetResponse = {rows, columns, totals};
    return assetResponse;
  } else {
    return {rows, columns: [], totals: []}
  }

}
