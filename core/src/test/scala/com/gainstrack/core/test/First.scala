package com.gainstrack.core.test

import java.time.LocalDate

import com.gainstrack.core._
import org.scalatest.FlatSpec


class First extends FlatSpec {

  val eqhkd = AccountCreation.parse("2010-01-01 open Equity:HSBCHK HKD")
  val equsd = AccountCreation.parse("2010-01-01 open Equity:HSBCUS USD")

  val hkhkd = AccountCreation(
    LocalDate.parse("2010-01-01"),
    AccountKey.apply(
      "Assets:HSBCHK",
      AssetId( "HKD")
    ),
    assetNonStdScu = None,
    code = "",
    description = "",
    hidden = false,
    placeholder = false
  )

  val hkusd = AccountCreation(
    LocalDate.parse("2010-01-01"),
    AccountKey(
      name = "Assets:HSBCUS",
      assetId = AssetId("USD")
    ),
    assetNonStdScu = None,
    code = "",
    description = "",
    hidden = false,
    placeholder = false
  )

  val tx = Transfer(
    source = "Assets:HSBCHK",
    dest = "Assets:HSBCUS",
    date = LocalDate.parse("2019-01-02"),
    sourceValue = "40000 HKD",
    targetValue = "5084.91 USD"
  )

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

  val cmds:Seq[AccountCommand] = Seq(eqhkd, equsd, hkhkd, hkusd, tx, bohkd, bohkd2)

  val orderedCmds = cmds.sorted

  "transfer" should "calc fx rate" in {
    val fx = tx.fxRate
    assert(fx == 0.12712275)
    assert (fx.denominatorIsValidLong)
    //assert ((1/fx) == 7.8664)
    assert(tx.toTransaction.isBalanced)
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
    println(bg.toBeancount)
  }
}