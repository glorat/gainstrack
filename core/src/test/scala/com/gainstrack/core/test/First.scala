package com.gainstrack.core.test

import java.time.LocalDate

import com.gainstrack.core._
import org.scalatest.FlatSpec


class First extends FlatSpec {

  val equity = AccountCreation(
    LocalDate.parse("2010-01-01"),
    AccountKey(
      name = "Equity",
      assetId = AssetId( "GBP")
    ),
    assetNonStdScu = None,
    code = "",
    description = "",
    hidden = false,
    placeholder = true
  )

  val asset = AccountCreation(
    LocalDate.parse("2010-01-01"),
    AccountKey.apply(
      name = "Assets",
      assetId = AssetId( "GBP")
    ),
    assetNonStdScu = None,
    code = "",
    description = "",
    hidden = false,
    placeholder = true
  )


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

  "transfer" should "calc fx rate" in {
    val fx = tx.fxRate
    assert(fx == 0.12712275)
    assert (fx.denominatorIsValidLong)
    //assert ((1/fx) == 7.8664)
    assert(tx.toTransaction.isBalanced)
  }
}