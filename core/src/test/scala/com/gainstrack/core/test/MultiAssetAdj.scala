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
    val acctId = AccountId("Assets:Bank:Cash:CAD")
    assert (bg.balanceState.getBalance(acctId, parseDate("2010-10-31")).value.round == 0.0)
    assert (bg.balanceState.getBalance(acctId, parseDate("2017-11-01")).value.round == 1500)
    assert (bg.balanceState.getBalance(acctId, parseDate("2019-11-01")).value.round == 10000)
  }

  it should "generate valid beancount" in {
    val res = bg.writeBeancountFile(s"/tmp/multiadj.beancount", parser.lineFor(_))
    assert(res.length == 0)
  }
}
