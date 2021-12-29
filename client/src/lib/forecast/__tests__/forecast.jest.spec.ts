import {ForecastState, ForecastStateEx, ForecastStrategy, performForecast} from 'src/lib/forecast/forecast';
import {find, round} from 'lodash';

describe('forecast', () => {
  test('sample case', () => {
    // https://networthify.com/calculator/earlyretirement?income=50000&initialBalance=0&expenses=20000&annualPct=5&withdrawalRate=4
    const initState: ForecastState = {
      timeunit: 2020,
      income: 50000,
      expenses: 20000,
      networth: 0
    }
    const strategy: ForecastStrategy = {
      roi: (networth:number) => round(networth * 0.05),
      inflation: () => 0,
      retirementTarget: state => state.roi > state.expenses
    }
    const states: ForecastStateEx[] = performForecast(initState, strategy)

    expect(states[0].timeunit).toStrictEqual( 2021)
    expect(states[9].timeunit).toStrictEqual( 2030)
    expect(states[9].networth).toStrictEqual( 386771)

    const retireEntry = find(states, state => state.roi > state.expenses)
    expect(retireEntry).toBeDefined()
    expect(retireEntry?.timeunit).toStrictEqual(2031)
  })
})
