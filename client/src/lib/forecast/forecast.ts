import {round} from 'lodash';

export interface ForecastState {
  timeunit: number
  income: number
  expenses: number
  networth: number
}

export interface ForecastStateEx extends ForecastState {
  roi: number
}


const sampleRoi = (networth:number) => round(networth * 0.05)

export function iterateForecast(state: ForecastState): ForecastStateEx {
  const investmentWorth = state.networth + (state.income - state.expenses)/2;
  const roi = sampleRoi(investmentWorth)
  const deltaNetworth = roi + state.income - state.expenses
  const ret = {
    timeunit: state.timeunit + 1,
    income: state.income,
    expenses: state.expenses,
    networth: state.networth + deltaNetworth,
    roi
  }
  return ret;
}
