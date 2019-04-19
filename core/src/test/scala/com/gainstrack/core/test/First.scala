package com.gainstrack.core.test

import java.nio.file.Files
import java.time.LocalDate

import com.gainstrack.core._
import org.scalatest.FlatSpec

import scala.collection.SortedMap


class First extends FlatSpec {
  val parser = new GainstrackParser
  Seq(
    "2010-01-01 open Assets:HSBCHK HKD",
    "2010-01-01 open Assets:HSBCCN CNY",
    "2000-01-01 open Assets:Bank:Nationwide GBP",
    "2000-01-01 open Assets:Bank:NationwideSavings GBP",
    "2000-01-01 open Assets:Bank:HSBCUK GBP",
    "1970-01-01 open Expenses:Investment:Fees:USD USD",
    "2010-01-01 open Equity:Opening:HKD HKD",
    "2010-01-01 open Equity:Opening:CNY CNY",
    "2010-01-01 open Equity:Opening:GBP GBP",
    "2010-01-01 open Assets:Investment:HSBC USD",
    "2010-01-01 open Assets:Investment:HSBC:USD USD",
    "2019-04-01 open Assets:Investment:IBUSD USD",
    "  expenseAccount: Expenses:Investment:Fees:USD",
    "2010-01-01 open Assets:Investment:Zurich GBP",
    "2010-01-01 open Assets:Investment:Zurich:GBP GBP",
    "2010-01-01 open Assets:Investment:OldMutual GBP",
    "2010-01-01 open Assets:Investment:OldMutual:GBP GBP",
    "2014-01-04 adj Assets:Bank:Nationwide 25613.71 GBP Equity:Opening:GBP",
    //"2018-07-31 adj Assets:Bank:Nationwide 57721.15 GBP Equity:Opening:GBP",

    "2019-04-01 adj Assets:Bank:Nationwide 134703.49 GBP Equity:Opening:GBP",
    "2019-04-01 adj Assets:Bank:NationwideSavings 53932.10 GBP Equity:Opening:GBP",
    "2019-02-14 adj Assets:HSBCHK 33030.33 HKD Equity:Opening:HKD",
    "2019-01-01 adj Assets:HSBCHK 138668.37 HKD Equity:Opening:HKD",
    "2019-01-01 adj Assets:HSBCCN 547413.70 CNY Equity:Opening:CNY",

    "2019-01-01 adj Assets:Investment:Zurich:GBP 348045.34 GBP Equity:Opening:GBP",
    "2019-01-01 trade Assets:Investment:Zurich 30511.46 AMER @5.09 GBP}",
    "2019-01-01 trade Assets:Investment:Zurich 75296 FTSE {2.1 GBP}",
    "2019-01-01 trade Assets:Investment:Zurich 28146.69 TBOND {1.23 GBP}",

    "2019-01-01 adj Assets:Investment:OldMutual:GBP 80300.28 GBP Equity:Opening:GBP",
    "2019-01-01 trade Assets:Investment:OldMutual 2221.2587 QS90 {15.03 GBP}",
    "2019-01-01 trade Assets:Investment:OldMutual 525.5707 OPXC {35.02 GBP}",
    "2019-01-01 trade Assets:Investment:OldMutual 538.2539 OPY7 {32.22 GBP}",
    "2019-01-01 trade Assets:Investment:OldMutual 752.8264 SVDK {2.533 GBP}",
    "2019-01-01 trade Assets:Investment:OldMutual 243.2453 GBR06HUW {16.37 GBP}",
    "2019-01-01 trade Assets:Investment:OldMutual 97.9586 GBR04S9K {18.40 GBP}",
    "2019-01-01 trade Assets:Investment:OldMutual 4578.3959 QLNC {0.7591 GBP}",


    "2019-01-02 tfr Assets:HSBCHK Assets:Investment:HSBC:USD 40000 HKD 5084.91 USD",
    "2019-01-02 trade Assets:Investment:HSBC 100 VTI {127.6300 USD}",
    "2019-03-08 trade Assets:Investment:HSBC 13 VCSH {79.0700 USD}",
    "2019-03-15 trade Assets:Investment:HSBC 14 VTI {144.6200 USD}",
    "2019-03-26 trade Assets:Investment:HSBC 30 VTI {143.8300 USD}",
    "2019-03-27 trade Assets:Investment:HSBC 15 BRK-B {200.5800 USD}",
    "2019-04-11 tfr Assets:Bank:Nationwide Assets:Bank:HSBCUK 19000 GBP 19000 GBP",
    "2019-04-11 tfr Assets:Investment:HSBC:USD Assets:Investment:IBUSD:USD 34975 USD 34975 USD",
    "2019-04-11 trade Assets:Investment:IBUSD 100 VWRD {85.7900 USD} 4.76 USD",
    "2019-04-11 trade Assets:Investment:IBUSD 230 VWRD {85.8300 USD} 10.84 USD",
    "2019-04-11 trade Assets:Investment:IBUSD 1000 IUAA {5.2250 USD} 2.93 USD",
    "2019-04-11 trade Assets:Investment:IBUSD 6 BRK-B {206.5300 USD} 0.34 USD"
  ).foreach(parser.parseLine)
  //val cmds:Seq[AccountCommand] = Seq(bohkd, bohkd2) ++ cmdLines

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
}