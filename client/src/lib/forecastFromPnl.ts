import {PLExplainDTO} from 'src/lib/PLExplain';
import {ForecastState} from 'src/lib/forecast/forecast';
import {ChronoUnit, LocalDate} from '@js-joda/core';


export function forecastFromPnl(pnl: PLExplainDTO): ForecastState {
  const toDate = LocalDate.parse(pnl.toDate)
  const fromDate = LocalDate.parse(pnl.fromDate)
  // Need to add one because we are inclusive
  const years = ChronoUnit.DAYS.between(fromDate, toDate.plusDays(1)) / 365; // Act365

  const state:ForecastState = {
    expenses : pnl.totalExpense / years,
    income : pnl.totalIncome / years,
    networth: pnl.toNetworth / years,
    timeunit: toDate.year()
  }
  return state
}
