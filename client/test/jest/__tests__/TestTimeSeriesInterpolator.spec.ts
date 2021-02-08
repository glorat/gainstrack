/* eslint-env jest */
/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "testMe", "interpTest"] }] */
/**
 * @jest-environment jsdom
 */
import {SortedColumnMap, linear, fromIntDate} from '../../../src/lib/SortedColumnMap';
import {SingleFXConversion} from 'src/lib/fx';
import {ProxyPricer} from 'src/lib/pricer';
import {AssetDTO} from 'src/lib/assetdb/models';
import {LocalDate} from '@js-joda/core';

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
    it('extrapolate after end', () => {
      interpTest(20200101, 365);
    })
    it('return exact values', () => {
      interpTest(20190101, 1);
      interpTest(20191231, 365);
    })
    it('linearly interpolate in between', () => {
      interpTest(20191230, 364);
      interpTest(20190102, 2);
    })
  })

  describe('ProxyPricer', () => {
    const mktDts = [20190615, 20190616, 20190617, 20190618];
    const mktVals = [100.0, 95.0, 100.0, 105.0];
    const mkt = new SingleFXConversion({'MKT': new SortedColumnMap(mktDts, mktVals)}, 'USD');

    const trdDts = [20190615, 20190617];
    const trdVals = [1000.0, 1000.0];
    const trd = new SingleFXConversion({'TRD': new SortedColumnMap(trdDts, trdVals)}, 'USD');
    const proxyPricer = new ProxyPricer(trd, mkt);

    const TRD: AssetDTO = {asset:'TRD', options: {proxy: 'MKT', tags: []}};

    const testMe = (dt: number, val: number) => expect(proxyPricer.getPrice(TRD, 'USD', fromIntDate(dt) as LocalDate )).toBe(val)

    it('return exacts', () => {
      testMe(trdDts[0], trdVals[0])
      testMe(trdDts[1], trdVals[1])
    })

    it ('flat line on low side', () => {
      // Hacky date maths
      testMe(trdDts[0]-10, trdVals[0])
    })

    it ('follow market on high side', () => {
      testMe(mktDts[mktDts.length-1], 1050)
    })

    it ('linear interpolate in the middle', () => {
      testMe(mktDts[1], 1000)
    })

    test.skip ('follow market in the middle', () => {
      testMe(mktDts[1], 1000)
    })
  })




})


