package com.gainstrack.core.test

import com.gainstrack.command.GainstrackParser
import com.gainstrack.core._
import com.gainstrack.report.{AccountInvestmentReport, AccountState, AssetChainMap, BalanceState, GainstrackGenerator, PLExplain, PriceFXConverter, SingleFXConverter, TransactionState}
import org.scalatest.flatspec.AnyFlatSpec

class JamesTest extends AnyFlatSpec {
  val parser = new GainstrackParser
  var bg:GainstrackGenerator = null

  "JamesTest" should "parse james" in {
    import scala.io.Source
    parser.parseLines(Source.fromResource("james.gainstrack").getLines())

  }

  it should "generate gainstrack" in {
    bg = new GainstrackGenerator(parser.getCommands)
  }

  it should "have 122,500 GBP net assets on 1 Jan 19" in {
    val assets = bg.dailyBalances.convertedPosition(Assets.accountId, parseDate("2019-01-01"),"global" )(bg.acctState, bg.assetChainMap, bg.tradeFXConversion)
    assert(assets.getBalance(AssetId("GBP")).number == 122500)
  }

  it should "have net assets 30 Nov 19 of GBP 185k" in {
    val assets = bg.dailyBalances.convertedPosition(Assets.accountId, parseDate("2019-11-30"),"global" )(bg.acctState, bg.assetChainMap, bg.tradeFXConversion)
    assert(assets.getBalance(AssetId("GBP")).number == 185000)
  }

  it should "have gain on USD forex of GBP62,500" in {
    val explain = new PLExplain(parseDate("2019-01-02"), parseDate("2019-11-30"))(bg.acctState, bg.txState, bg.balanceState, bg.priceFXConverter, bg.assetChainMap, bg.tradeFXConversion)
    val usdExplain =explain.deltaExplain.find(_.assetId == AssetId("USD")).get
    assert(usdExplain.explain == 62500.00)
  }

  it should "calc irr for the fx" in {
    val accountId = AccountId("Assets:Equities:USDStock")
    val rep = new AccountInvestmentReport(accountId, AssetId("GBP"), parseDate("2019-01-01"), parseDate("2019-11-30"), bg.acctState, bg.balanceState, bg.txState, bg.tradeFXConversion)


    assert( (rep.irr*100).round == 114)
    assert(rep.startBalance.number == -12500)

    val rep2 = new AccountInvestmentReport(accountId, AssetId("GBP"), parseDate("2019-01-01"), parseDate("2020-09-25"), bg.acctState, bg.balanceState, bg.txState, bg.tradeFXConversion)
    assert( (rep2.irr*100).round == 49)
  }
}
