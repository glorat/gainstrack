import {ForecastState, ForecastStateEx, performForecast} from 'src/lib/forecast/forecast';
import {find} from 'lodash';

describe('forecast', () => {
  test('sample case', () => {
    // https://networthify.com/calculator/earlyretirement?income=50000&initialBalance=0&expenses=20000&annualPct=5&withdrawalRate=4
    const initState: ForecastState = {
      timeunit: 2020,
      income: 50000,
      expenses: 20000,
      networth: 0
    }
    const states: ForecastStateEx[] = performForecast(initState)

    expect(states[9].timeunit === 10)
    expect(states[9].networth === 386771)

    const retireEntry = find(states, state => state.roi > state.expenses)
    expect(retireEntry).toBeDefined()
    expect(retireEntry?.timeunit === 2030)
  })
})
