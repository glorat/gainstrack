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

export interface ForecastStrategy {
  roi : (networth:number) => number
}

const sampleRoi = (networth:number) => round(networth * 0.04)

const defaultStrategy: ForecastStrategy = {
  roi : sampleRoi
}


export function performForecast(initState: ForecastState, forecastStrategy:ForecastStrategy = defaultStrategy): ForecastStateEx[] {

  const cond = (state:ForecastStateEx) => (state.timeunit-initState.timeunit)<=30 && state.roi <= state.expenses

  let state = iterateForecast(initState, forecastStrategy);
  const states:ForecastStateEx[] = [state];
  while (cond(state)) {
    state = iterateForecast(state, forecastStrategy)
    states.push(state)
  }
  return states;
}

export function iterateForecast(state: ForecastState, forecastStrategy:ForecastStrategy): ForecastStateEx {
  const investmentWorth = state.networth + (state.income - state.expenses)/2;
  const roi = forecastStrategy.roi(investmentWorth)
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
