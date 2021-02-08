import fs from 'fs';
import {AllState} from 'src/lib/assetdb/models';
import {AllStateEx} from 'src/lib/AllStateEx';
import {isSubAccountOf, positionSetFx, positionUnderAccount} from 'src/lib/utils';
import { LocalDate } from '@js-joda/core';
import {pnlExplain} from 'src/lib/PLExplain';
import { accountInvestmentReport } from 'src/lib/AccountInvestmentReport';

describe('James', () => {
  describe('State', () => {
    const data = fs.readFileSync('test/jest/__tests__/james.json', 'utf8' );
    const allState: AllState = JSON.parse(data);
    const allStateEx = new AllStateEx(allState)

    test('should parse test input', () => {
      expect(allState.baseCcy).toBe('GBP');
    })

    test('should have 122,500 GBP net assets on 1 Jan 19', () => {
      const pSet = positionUnderAccount(allStateEx.allPostingsEx(), 'Assets')
      const balance = positionSetFx(pSet, 'GBP', LocalDate.parse('2019-01-01'), allStateEx.tradeFxConverter())
      expect(balance).toEqual(122500)
    })

    test('should have net assets of 185k at 30 Nov 19', () => {
      const pSet = positionUnderAccount(allStateEx.allPostingsEx(), 'Assets')
      const balance = positionSetFx(pSet, 'GBP', LocalDate.parse('2019-11-30'), allStateEx.tradeFxConverter())
      expect(balance).toEqual(185000)
    });

    test('should have gain on USD forex of GBP62,500', () => {
      const myPs = allStateEx.allPostingsEx().filter(p => isSubAccountOf(p.account, 'Assets'));
      const explain = pnlExplain(LocalDate.parse('2019-01-02'), LocalDate.parse('2019-11-30'),
        myPs, allStateEx.state.commands, 'GBP', allStateEx.tradeFxConverter())
      const gbpDelta = explain.delta.find(d => d?.assetId === 'USD')
      expect(gbpDelta).toBeDefined();
      expect(gbpDelta?.explain).toBe(62500);
    });

    test('calc irr for the fx', () => {
      const fromDate = LocalDate.parse('2019-01-01')
      const queryDate = LocalDate.parse('2019-11-30')
      const rep = accountInvestmentReport('Assets:Equities:USDStock', 'GBP', fromDate, queryDate, allStateEx.allTxs(), allStateEx.allPostingsEx(), allStateEx.tradeFxConverter())
      expect(rep.irr).toBeCloseTo(1.14)
    })

  })

});
