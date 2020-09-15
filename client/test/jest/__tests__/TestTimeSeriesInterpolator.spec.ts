/* eslint-env jest */
/**
 * @jest-environment jsdom
 */
import {SortedColumnMap, linear} from "../../../src/lib/SortedColumnMap";

describe('TestTimeSeriesInterpolator', () => {
  const data = new SortedColumnMap([20190101, 20191231], [1, 365])

  const interpTest = (dt: number, expected: number|undefined) => {
    const nearest = data.getNearest(dt);
    if (nearest === undefined) {
      expect(expected).toBeUndefined()
    } else {
      const v = linear(nearest, dt);
      expect (v).toEqual(expected);
    }
  }

  describe('TimeSeriesTest', () => {
    it('extrapolates before the start', () => {
      interpTest(20180101, 1)
    })
    it("extrapolate after end", () => {
      interpTest(20200101, 365);
    })
    it("return exact values", () => {
      interpTest(20190101, 1);
      interpTest(20191231, 365);
    })
    it("linearly interpolate in between", () => {
      interpTest(20191230, 364);
      interpTest(20190102, 2);
    })
  })
})
