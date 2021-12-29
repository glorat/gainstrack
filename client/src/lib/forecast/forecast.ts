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
  inflation : (networth:number) => number
  retirementTarget: (state: ForecastStateEx) => boolean
}

const rate = (rate:number) => (base:number) => round(base * rate)

const defaultStrategy: ForecastStrategy = {
  roi : rate(0.07),
  inflation: rate(0.03), // Global inflation has been around 3% the last decade
  retirementTarget: state => state.networth > state.expenses*25 // 4% SWR rule
}


export function performForecast(initState: ForecastState, forecastStrategy:ForecastStrategy = defaultStrategy): ForecastStateEx[] {

  const cond = (state:ForecastStateEx) => (state.timeunit-initState.timeunit)<=30 && !(forecastStrategy.retirementTarget(state))

  let state = iterateForecast(initState, forecastStrategy);
  const states:ForecastStateEx[] = [state];
  while (cond(state)) {
    state = iterateForecast(state, forecastStrategy)
    states.push(state)
  }
  return states;
}

export function iterateForecast(state: ForecastState, forecastStrategy:ForecastStrategy): ForecastStateEx {
  const deltaExpense = forecastStrategy.inflation(state.expenses)
  const newExpense = state.expenses + deltaExpense
  const investmentWorth = state.networth + (state.income - state.expenses)/2; // Still using orig expenses to bias investment
  const roi = forecastStrategy.roi(investmentWorth)
  const deltaNetworth = roi + state.income - newExpense
  const ret = {
    timeunit: state.timeunit + 1,
    income: state.income,
    expenses: newExpense,
    networth: state.networth + deltaNetworth,
    roi
  }
  return ret;
}
