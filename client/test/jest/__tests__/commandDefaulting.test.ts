import {defaultedTransferCommand} from 'src/lib/commandDefaulting';
import fs from 'fs';
import {AllState} from 'src/lib/assetdb/models';
import {AllStateEx} from 'src/lib/AllStateEx';
import {GlobalPricer} from 'src/lib/pricer';


describe('commandDefaulting', () => {
  const data = fs.readFileSync('test/jest/__tests__/first.json', 'utf8' );
  const allState: AllState = JSON.parse(data);
  const allStateEx = new AllStateEx(allState)
  const pricer = new GlobalPricer(allState.commands, allState.ccys, allStateEx.tradeFxConverter(), allStateEx.tradeFxConverter())

  describe('defaultedTransferCommand', () => {

    test('transfer from multi-asset should default to itself', () => {
      const c = {'commandType':'tfr','date':'2021-12-19','change':{'number':2324,'ccy':'HKD'},'balance':{'number':0,'ccy':''},'price':{'number':0,'ccy':''},'commission':{'number':0,'ccy':''},'accountId':'Assets:Investment:IB','otherAccount':'','options':{'targetChange':{'number':297.72764,'ccy':'USD'}},'asset':''}
      c.accountId = 'Assets:Investment:OldMutual'; // a multi-asset account
      const dc = defaultedTransferCommand(c, allStateEx, pricer)
      expect(dc.otherAccount).toStrictEqual(c.accountId)
    })

    test('transfer from single-asset should default to no account', () => {
      const c = {'commandType':'tfr','date':'2021-12-19','change':{'number':2324,'ccy':'HKD'},'balance':{'number':0,'ccy':''},'price':{'number':0,'ccy':''},'commission':{'number':0,'ccy':''},'accountId':'Assets:Investment:IB','otherAccount':'','options':{'targetChange':{'number':297.72764,'ccy':'USD'}},'asset':''}
      c.accountId = 'Assets:Investment'; // a single-asset account
      const dc = defaultedTransferCommand(c, allStateEx, pricer)
      expect(dc.otherAccount).toStrictEqual('')
    })
  })
})
