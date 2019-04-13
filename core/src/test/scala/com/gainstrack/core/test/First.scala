package com.gainstrack.core.test

import java.time.LocalDate

import com.gainstrack.core._
import org.scalatest.FlatSpec


class First extends FlatSpec {

  val eqhkd = AccountCreation.parse("2010-01-01 open Equity:HSBCHK HKD")
  val equsd = AccountCreation.parse("2010-01-01 open Equity:HSBCUS USD")

  val hkhkd = AccountCreation.parse("2010-01-01 open Assets:HSBCHK HKD")
  val hkusd = AccountCreation.parse("2010-01-01 open Assets:HSBCUS USD")

  val ibusd = AccountCreation.parse("2010-01-01 open Assets:Investment:IBUSD USD")


  val tx = Transfer.parse("2019-01-02 tfr Assets:HSBCHK Assets:HSBCUS 40000 HKD 5084.91 USD")

  val bohkd = BalanceObservation(
    accountId = "Assets:HSBCHK",
    date = LocalDate.parse("2019-01-01"), // post or enter?
    balance = "138668.37 HKD"
  )

  val bohkd2 = BalanceObservation(
    accountId = "Assets:HSBCHK",
    date = LocalDate.parse("2014-01-04"), // post or enter?
    balance = "33030.33 HKD"
  )

  val sec1 = SecurityPurchase.parse("2019-01-02 trade Assets:Investment:IBUSD 100 VTI {127.6300 USD}")

  val cmds:Seq[AccountCommand] = Seq(eqhkd, equsd, ibusd, hkhkd, hkusd, tx, bohkd, bohkd2, sec1)

  val orderedCmds = cmds.sorted

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
      dest = "Assets:HSBCUS",
      date = LocalDate.parse("2019-01-02"),
      sourceValue = "40000 HKD",
      targetValue = "5084.91 USD"
    )

    assert(tx == tx2)
  }

  "cmds" should "process" in {
    val machine = new OrderedCommandValidator
    orderedCmds.foreach(cmd => {
      machine.applyChange(cmd)
    })
  }

  it should "generate beancount" in {
    val bg = new BeancountGenerator
    for (elem <- orderedCmds) {
      bg.applyChange(elem)
    }
    val output = "option \"title\" \"Example Beancount file\"\noption \"operating_currency\" \"USD\"\n2010-01-01 open Equity:HSBCHK HKD\n2010-01-01 open Equity:HSBCUS USD\n2010-01-01 open Assets:HSBCHK HKD\n2010-01-01 open Assets:HSBCUS USD\n2014-01-03 pad Assets:HSBCHK Equity:HSBCHK\n2014-01-04 balance Assets:HSBCHK 33030.33 HKD\n2018-12-31 pad Assets:HSBCHK Equity:HSBCHK\n2019-01-01 balance Assets:HSBCHK 138668.37 HKD\n2019-01-02 * \"\"\n  Assets:HSBCHK -40000.0 HKD @0.12712275 USD\n  Assets:HSBCUS 5084.91 USD\n"
    //assert (output == bg.toBeancount)
    println(bg.toBeancount)
  }
}