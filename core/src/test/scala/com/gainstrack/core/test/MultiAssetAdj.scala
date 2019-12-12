package com.gainstrack.core.test

import com.gainstrack.command.GainstrackParser
import com.gainstrack.core._
import com.gainstrack.report._
import org.scalatest.FlatSpec


class MultiAssetAdj extends FlatSpec {
  val parser = new GainstrackParser
  var bg:GainstrackGenerator = null

  "parser" should "parse multiasset adj command" in {
    import scala.io.Source
    parser.parseLines(Source.fromResource("multiadj.gainstrack").getLines)

  }

  it should "generate gainstrack" in {
    bg = new GainstrackGenerator(parser.getCommands)
  }

  it should "handle success adjustments to different levels" in {
    val acctId = AccountId("Assets:Bank:CAD")
    assert (bg.balanceState.getBalance(acctId, parseDate("2010-10-31")).number.round == 0.0)
    assert (bg.balanceState.getBalance(acctId, parseDate("2017-11-01")).number.round == 1500)
    assert (bg.balanceState.getBalance(acctId, parseDate("2019-11-01")).number.round == 10000)
  }

  it should "generate expected transactions" in {
    val txs = bg.txState.allTransactions
    // Adjustments are done the day before to achieve the start of day balance
    assert(txs(0).postDate == parseDate("2017-10-30"))
    assert(txs(0).filledPostings == Seq(
      Posting("Equity:Opening:CAD", Amount(-1500, AssetId("CAD"))),
      Posting("Assets:Bank:CAD", Amount(1500, AssetId("CAD")))
    ))

    assert(txs(1).postDate == parseDate("2019-10-30"))
    assert(txs(1).filledPostings == Seq(
      Posting("Equity:Opening:CAD", Amount(-8500, AssetId("CAD"))),
      Posting("Assets:Bank:CAD", Amount(8500, AssetId("CAD")))
    ))

    assert(txs(2).postDate == parseDate("2019-11-11"))
    assert(txs(2).filledPostings == Seq(
      Posting("Assets:Bank:CAD", Amount(-10000, AssetId("CAD"))),
      Posting("Assets:Bank:XIU", Amount(1000, AssetId("XIU")), Amount(10, AssetId("CAD")))
    ))
  }

  it should "generate expected cash balances" in {
    val testMe = (amt:Fraction, dt:String) => assert(Amount(amt, AssetId("CAD")) == bg.balanceState.getBalance(AccountId("Assets:Bank:CAD"), parseDate(dt)))

    // On the day of adjustment
    testMe(10000, "2019-10-30")
    // On the start of day of adjustment (with no further txs)
    testMe(10000, "2019-10-31")
  }

  it should "generate expected cash balances for same day adj and trade" in {
    val testMe = (amt:Fraction, dt:String) => assert(Amount(amt, AssetId("CAD")) == bg.balanceState.getBalance(AccountId("Assets:Bank:CAD"), parseDate(dt)))

    // On the day of adjustment
    testMe(1001, "2019-11-30")
    // On end of day of adj + spend
    testMe(1, "2019-12-01")
  }

  it should "generate expected cash balances for same day trade and bal" in {
    val testMe = (amt:Fraction, dt:String) => assert(Amount(amt, AssetId("CAD")) == bg.balanceState.getBalance(AccountId("Assets:Bank:CAD"), parseDate(dt)))
    // Before any activity
    testMe(1, "2019-12-04")
    // On end of day of adj + spend, it washes back
    testMe(1, "2019-12-05")
    // And stays there
    testMe(1, "2019-12-06")
  }

  it should "generate valid beancount" in {
    val res = bg.writeBeancountFile(s"/tmp/multiadj.beancount", parser.lineFor(_))
    assert(res.length == 0)
  }

  "assetChainMap" should "include cost basis conversion" in {
    assert(bg.assetChainMap.map(AccountId("Assets:Bank:XIU")).map(_.symbol) == Seq("XIU", "CAD", "USD"))
  }

  "single fx converter" should "match priceCollector" in {
    val dt = parseDate("2019-01-01")
    val fx1 = bg.priceState.getFX(AssetId("XIU"), AssetId("CAD"), dt)
    assert(fx1.get == 10)
    assert(None == bg.priceState.getFX(AssetId("XIU"), AssetId("USD"), dt))

    val singleFXConversion = SingleFXConversion.generate(bg.acctState.baseCurrency)(bg.priceState, bg.assetChainMap)
    val x = singleFXConversion.getFX(AssetId("XIU"), AssetId("USD"), dt)
    assert(x.get == 5)
    assert(None == singleFXConversion.getFX(AssetId("XIU"), AssetId("CAD"), dt))
  }

  it should "interpolate" in {
    val dt = parseDate("2018-01-01")

    val fx1 = bg.priceState.getFX(AssetId("XIU"), AssetId("CAD"), dt)
    assert(fx1.get == 10)

    val singleFXConversion = SingleFXConversion.generate(bg.acctState.baseCurrency)(bg.priceState, bg.assetChainMap)
    val x = singleFXConversion.getFX(AssetId("XIU"), AssetId("USD"), dt)
    assert(x.get == 4)
  }
}
