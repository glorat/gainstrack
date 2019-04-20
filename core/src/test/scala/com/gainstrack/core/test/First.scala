package com.gainstrack.core.test

import java.nio.file.Files
import java.time.LocalDate

import com.gainstrack.core._
import org.scalatest.FlatSpec

import scala.collection.SortedMap


class First extends FlatSpec {
  val parser = new GainstrackParser
  import scala.io.Source
  Source.fromResource("src.gainstrack").getLines.foreach(parser.parseLine)

  val cmds = parser.getCommands

  val orderedCmds = cmds.sorted


  val tx = Transfer.parse("2019-01-02 tfr Assets:HSBCHK Assets:Investment:HSBC:USD 40000 HKD 5084.91 USD")

  "transfer" should "calc fx rate" in {
    val fx = tx.fxRate
    assert(fx == 0.12712275)
    assert (fx.denominatorIsValidLong)
    //assert ((1/fx) == 7.8664)
    assert(tx.toTransaction.isBalanced)
  }

  it should "parse" in {
    val tx2 = Transfer(
      source = "Assets:HSBCHK",
      dest = "Assets:Investment:HSBC:USD",
      date = LocalDate.parse("2019-01-02"),
      sourceValue = "40000 HKD",
      targetValue = "5084.91 USD"
    )

    assert(tx == tx2)
  }

  "adj" should "parse" in {

    val bohkd = BalanceAdjustment(
      accountId = "Assets:HSBCHK",
      date = LocalDate.parse("2019-01-01"), // post or enter?
      balance = "138668.37 HKD",
      adjAccount = "Equity:Opening:HKD"
    )

    assert(BalanceAdjustment.parse("2019-01-01 adj Assets:HSBCHK 138668.37 HKD Equity:Opening:HKD") == bohkd)
  }

  lazy val validator : OrderedCommandValidator = {
    val machine = new OrderedCommandValidator
    orderedCmds.foreach(cmd => {
      machine.applyChange(cmd)
    })
    machine
  }

  "cmds" should "process" in {
    validator
  }

  it should "parse account options" in {
    val acct = validator.getState.accounts.find(x => x.name == "Assets:Investment:IBUSD").getOrElse(fail("Missing account"))
    assert (acct.options.expenseAccount == Some("Expenses:Investment:Fees:USD"))
  }

  it should "generate beancount" in {
    val bg = new BeancountGenerator
    for (elem <- orderedCmds) {
      bg.applyChange(elem)
    }
    val output = "option \"title\" \"Example Beancount file\"\noption \"operating_currency\" \"USD\"\n2010-01-01 open Equity:Opening:HKD HKD\n2010-01-01 open Equity:HSBCUS USD\n2010-01-01 open Assets:HSBCHK HKD\n2010-01-01 open Assets:HSBCUS USD\n2014-01-03 pad Assets:HSBCHK Equity:Opening:HKD\n2014-01-04 balance Assets:HSBCHK 33030.33 HKD\n2018-12-31 pad Assets:HSBCHK Equity:Opening:HKD\n2019-01-01 balance Assets:HSBCHK 138668.37 HKD\n2019-01-02 * \"\"\n  Assets:HSBCHK -40000.0 HKD @0.12712275 USD\n  Assets:HSBCUS 5084.91 USD\n"
    //assert (output == bg.toBeancount)
    import java.nio.file.{Paths, Files}
    import java.nio.charset.StandardCharsets

    Files.write(Paths.get("/tmp/gainstrack.beancount"), bg.toBeancount.getBytes(StandardCharsets.UTF_8))

  }

  it should "project balances" in {
    val bp = new BalanceProjector(validator.getState.accounts)
    for (elem <- orderedCmds) {
      bp.applyChange(elem)
    }
    // After commissions, should be 172.05
    assert(bp.getState.balances("Assets:Investment:IBUSD:USD").last._2 == 172.05)
    assert(bp.getState.balances("Expenses:Investment:Fees:USD").last._2 == 18.87)
  }
  lazy val priceCollector : PriceCollector = {
    val machine = new PriceCollector
    orderedCmds.foreach(cmd => {
      machine.applyChange(cmd)
    })
    machine
  }
  "price collector" should "process" in {
    priceCollector
  }

  it should "infer prices from transfers" in {
    assert(priceCollector.getState.prices.size == 32)

    assert(priceCollector.getState.prices(AssetTuple(AssetId("USD"),AssetId("HKD")))
      == Map(parseDate("2019-01-02")-> 7.866412581540283))

    assert(priceCollector.getState.prices(AssetTuple(AssetId("VTI"),AssetId("USD"))) == Map(
      parseDate("2019-01-02") ->127.63,
      parseDate("2019-03-15") -> 144.62,
      parseDate("2019-03-26") -> 143.83)
    )
  }

  it should "provide interpolated prices" in {
    val fx = priceCollector.getState.getFX(AssetTuple("VTI","USD"), parseDate("2019-02-01"))
    // Interp between 127 and 144
    assert(fx.get ==  161651.0/1200.0) //134.709166666
  }
}