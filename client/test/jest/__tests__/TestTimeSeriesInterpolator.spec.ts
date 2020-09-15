/* eslint-env jest */
/**
 * @jest-environment jsdom
 */
import {SortedColumnMap, linear} from "../../../src/lib/SortedColumnMap";

describe('TestTimeSeriesInterpolator', () => {
  const data = new SortedColumnMap([20190101, 20191231], [1, 365])

  describe('TimeSeriesTest', () => {
    it('extrapolates before the start', () => {
      const nearest = data.getNearest(20180101);
      expect(nearest).toBeDefined()
      const v = linear(nearest, 20180101)

      expect(v).toEqual(1)
    })
  })
})
