package com.gainstrack.core.test

import java.time.LocalDate

import com.gainstrack.core._
import org.scalatest.FlatSpec

import AssetType._

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
      "Assets:HSBC HK",
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
      name = "Assets:HSBC US",
      assetId = AssetId( "USD")
    ),
    assetNonStdScu = None,
    code = "",
    description = "",
    hidden = false,
    placeholder = false
  )

  val tx = Transfer(
    id = java.util.UUID.randomUUID(),
    source = hkhkd.guid,
    dest = hkusd.guid,
    date = LocalDate.parse("2019-01-02"),
    sourceValue = Balance(40000,"HKD"),
    targetValue = Balance(5084.91, "USD")
  )

  val bohkd = BalanceObservation(
    id = java.util.UUID.randomUUID(),
    accountId = hkhkd.guid,
    date = LocalDate.parse("2019-01-01"), // post or enter?
    value = 138668.37,
    currency = AssetId( "HKD")
  )

  val bohkd2 = BalanceObservation(
    id = java.util.UUID.randomUUID(),
    accountId = hkhkd.guid,
    date = LocalDate.parse("2014-01-04"), // post or enter?
    value = 33030.33,
    currency = AssetId( "HKD")
  )

  "transfer" should "calc fx rate" in {
    val fx = tx.fxRate
    assert(fx == 0.12712275)
    assert (fx.denominatorIsValidLong)
    //assert ((1/fx) == 7.8664)
    assert(tx.toTransaction.isBalanced)
  }
}