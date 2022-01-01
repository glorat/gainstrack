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

const inflation = (args:Record<string, string|number>) => ({
  condition: ()=>true,
  action: (state:ForecastStateEx) => {
    const rate:number = 1+ +args['inflation']/100
    state = {...state, income: state.income /* *rate */, expenses: round(state.expenses*rate)};
    return state;
  }
})

const roi = (args:Record<string, string|number>) => ({
  condition: ()=>true,
  action: (state:ForecastStateEx) => {
    const investmentWorth = state.networth + (state.income - state.expenses)/2; // Still using orig expenses to bias investment
    const rate:number = +args['roi']/100
    state = {...state, roi: round(investmentWorth*rate)};
    return state;
  }
})

interface Model {
  condition: (state:ForecastStateEx) => boolean
  action: (state: ForecastStateEx) => ForecastStateEx
}

const forecastModelRegister: Record<string, (args:Record<string, string|number>) => Model> = {
  inflation,
  roi
}

export interface ModelSpec {
  model: string
  args: Record<string, string|number>
}

export const defaultForecastModels: ModelSpec[] = [
  {model: 'inflation', args: {inflation: 3}}, // Global inflation has been around 3% the last decade
  {model: 'roi', args: {roi: 7}} // Global equities have been 8% in the last decade. So lower due to bonds
];

export function performForecast(initState: ForecastState, forecastSpecs:ModelSpec[]): ForecastStateEx[] {

  const cond = (state:ForecastStateEx) => (state.timeunit-initState.timeunit)<=30

  let state = iterateForecast(initState, forecastSpecs);
  const states:ForecastStateEx[] = [state];
  while (cond(state)) {
    state = iterateForecast(state, forecastSpecs)
    states.push(state)
  }
  return states;
}

export function iterateForecast(origState: ForecastState, forecastSpecs:ModelSpec[]): ForecastStateEx {
  let state: ForecastStateEx = {...origState, timeunit: origState.timeunit+1, roi:0};
  forecastSpecs.forEach(spec => {
    const modelSpec = forecastModelRegister[spec.model]
    const model = modelSpec(spec.args)
    if (model.condition(state)) {
      state = model.action(state)
    }
  })

  const deltaNetworth = state.roi + state.income - state.expenses
  const ret:ForecastStateEx = {
    ...state,
    networth: state.networth + deltaNetworth,
  }
  return ret;
}
