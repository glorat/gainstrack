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
