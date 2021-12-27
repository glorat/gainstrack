import {ForecastState, ForecastStateEx, iterateForecast} from 'src/lib/forecast/forecast';
import {find} from 'lodash';

describe('forecast', () => {
  test('sample case', () => {
    // https://networthify.com/calculator/earlyretirement?income=50000&initialBalance=0&expenses=20000&annualPct=5&withdrawalRate=4
    const initState: ForecastState = {
      timeunit: 0,
      income: 50000,
      expenses: 20000,
      networth: 0
    }
    let state = iterateForecast(initState);
    const states:ForecastStateEx[] = [state];
    for (let t=0; t<14; t++) {
      state = iterateForecast(state)
      states.push(state)
    }

    expect(states[9].timeunit === 10)
    expect(states[9].networth === 386771)

    const retireEntry = find(states, state => state.roi > state.expenses)
    expect(retireEntry).toBeDefined()
    expect(retireEntry!.timeunit === 10)
  })
})
