package com.gainstrack.core.test

import com.gainstrack.command.GainstrackParser
import com.gainstrack.core._
import com.gainstrack.report.GainstrackGenerator
import org.scalatest.FlatSpec

class NoEquityTest extends FlatSpec {
  val parser = new GainstrackParser

  import scala.io.Source

  parser.parseLines(Source.fromResource("noequity.gainstrack").getLines)
  val cmds = parser.getCommands
  val bg = new GainstrackGenerator(cmds)

  "Gainstrack with no equity" should "generate beancount" in {
    val bFile = "/tmp/div.beancount"
    val errs = bg.writeBeancountFile("/tmp/noequity.beancount", parser.lineFor(_))
    assert(errs.isEmpty)
  }

  it should "generate balances for equity" in {
    bg.dailyBalances.convertedPosition(Assets.accountId, MaxDate, "global")(bg.acctState, bg.priceState, bg.assetChainMap)
    bg.dailyBalances.convertedPosition(Equity.accountId, MaxDate, "global")(bg.acctState, bg.priceState, bg.assetChainMap)
  }
}
