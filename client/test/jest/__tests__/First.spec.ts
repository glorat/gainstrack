import fs from 'fs';
import {AllState} from 'src/lib/assetdb/models';
import {AllStateEx} from 'src/lib/AllStateEx';
import {positionUnderAccount, convertedPositionSet} from 'src/lib/utils';
import { LocalDate } from '@js-joda/core';
import {pnlExplainMonthly} from 'src/lib/PLExplain';
import {balanceTreeTable} from 'src/lib/TreeTable';
import {GlobalPricer} from 'src/lib/pricer';
import {SingleFXConversion} from 'src/lib/fx';

describe('First', () => {
  describe('State', () => {
    const data = fs.readFileSync('test/jest/__tests__/first.json', 'utf8' );
    const allState: AllState = JSON.parse(data);
    const allStateEx = new AllStateEx(allState)
    const today = LocalDate.parse('2019-12-31');

    test('should parse test input', () => {
      expect(allState.baseCcy).toBe('GBP');
    })

    test('should correct balances', () => {
      const pSet = positionUnderAccount(allStateEx.allPostingsEx(), 'Assets:Investment:IBUSD:USD')
      expect(pSet['USD']).toBeCloseTo(172.05)

      const pSet2 = positionUnderAccount(allStateEx.allPostingsEx(), 'Expenses:Investment:IBUSD:USD')
      expect(pSet2['USD']).toBeCloseTo(18.87)

      const pSet3 = positionUnderAccount(allStateEx.allPostingsEx(), 'Assets')
      expect(pSet3['USD']).toBeCloseTo(-52857.23)
    });

    test('should have a list of all ccys', () => {
      expect(allState.ccys.length).toBe(18)
    });

    test('should convert balances', () => {
      const testMe = (accountId: string, strategy: string, ccy: string, expected: number) => {
        const pSet = positionUnderAccount(allStateEx.allPostingsEx(), accountId);
        const account = allState.accounts.find(x => x.accountId === accountId)
        // const value = positionSetFx(pSet, ccy, today, allStateEx.tradeFxConverter())
        const value = convertedPositionSet(pSet, allState.baseCcy, strategy, today, account, allStateEx.tradeFxConverter())
        expect(Math.round(value[ccy])).toBe(expected)
      }

      testMe('Assets:Investment:IBUSD:USD', 'parent', 'USD', 172)
      testMe('Expenses:Investment:IBUSD:USD', 'parent', 'USD', 19)
      testMe('Assets:Investment:IBUSD', 'parent', 'USD', 34960)

      testMe('Assets:Investment', 'parent', 'GBP', 433653)
      testMe('Assets', 'parent', 'GBP', 625582)


      testMe('Assets:Investment:IBUSD:USD', 'GBP', 'GBP', 135)
      testMe('Assets', 'GBP', 'GBP', 625582)

      testMe('Assets:Investment:IBUSD', 'units', 'USD', 172)

      testMe('Assets:Investment:IBUSD', 'USD', 'USD', 34960)
      testMe('Assets', 'USD', 'USD', 797742)
    });


    test('pnlExplain monthly', () => {
      const pnl = pnlExplainMonthly(today, allStateEx.allPostingsEx(), allState.commands, allState.baseCcy, allStateEx.tradeFxConverter());
      expect(pnl).toMatchSnapshot();
    })

    test('asset tree converted to global', () => {
      const tree = balanceTreeTable('Assets', today, 'GBP', 'global', allState.accounts, allStateEx.allPostingsEx(), allStateEx.tradeFxConverter())
      expect(tree).toMatchSnapshot();
    })

    describe('global pricer', () => {
      const tradeFxConverter = allStateEx.tradeFxConverter()
      const pricer = new GlobalPricer(allState.commands, allState.ccys, tradeFxConverter, tradeFxConverter)

      test('should handle base ccy', () => {
        const one = pricer.getFX('GBP', 'GBP', today)
        expect(one).toBe(1)
      })
    })

    test('should handle base ccy with no fx', () => {
      const emptyFx = SingleFXConversion.fromDTO({}, 'USD')
      const pricer = new GlobalPricer([], [], emptyFx, emptyFx)
      const one = pricer.getFX('USD', 'USD', today)
      expect(one).toBe(1)
    })

    test('should handle base ccy with one fx', () => {
      const emptyFx = SingleFXConversion.fromDTO({}, 'USD')
      const pricer = new GlobalPricer([], ['USD'], emptyFx, emptyFx)
      const one = pricer.getFX('USD', 'USD', today)
      expect(one).toBe(1)
    })


  })

});
