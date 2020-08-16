package com.gainstrack.core.test

import com.gainstrack.command.GainstrackParser
import com.gainstrack.core._
import com.gainstrack.report.{BalanceReport, GainstrackGenerator, PLExplain}
import org.scalatest.flatspec.AnyFlatSpec

class NoEquityTest extends AnyFlatSpec {
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
    //bg.dailyBalances.convertedPosition(Assets.accountId, MaxDate, "global")(bg.acctState, bg.priceState, bg.assetChainMap)
    //bg.dailyBalances.convertedPosition(Equity.accountId, MaxDate, "global")(bg.acctState, bg.priceState, bg.assetChainMap)
    val balanceReport = BalanceReport(bg.txState.cmds, MinDate, MaxDate)
    // Note that income/equity has reversed sign per accounting norms
    val totalEquity = balanceReport.getState.convertedPosition(Equity.accountId, MinDate, "global")( bg.assetChainMap, bg.acctState, bg.priceFXConverter, bg.tradeFXConversion).getBalance(bg.acctState.baseCurrency).number.toDouble
    assert(totalEquity == 0)

  }

  it should "generate pnl explain" in {
    val exp = new PLExplain(parseDate("1900-01-01"), MaxDate)(bg.acctState, bg.txState, bg.balanceState, bg.priceFXConverter, bg.assetChainMap, bg.tradeFXConversion)
    exp.actualPnl
  }
}
