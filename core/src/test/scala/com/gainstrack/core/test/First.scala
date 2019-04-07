package com.gainstrack.core.test

import java.time.LocalDate

import com.gainstrack.core._
import org.scalatest.FlatSpec

import AssetType._

class First extends FlatSpec {

  val equity = AccountCreation(
    AccountKey(
      name = "Equity",
      accountType = "Equity",
      assetId = AssetId(Currency, "GBP")
    ),
    assetNonStdScu = None,
    code = "",
    description = "",
    hidden = false,
    placeholder = true
  )

  val asset = AccountCreation(
    AccountKey.apply(
      name = "Assets",
      accountType = "Asset",
      assetId = AssetId(Currency, "GBP")
    ),
    assetNonStdScu = None,
    code = "",
    description = "",
    hidden = false,
    placeholder = true
  )


  val hkhkd = AccountCreation(
    AccountKey.apply(
      "HSBC HK",
      "Asset",
      AssetId(Currency, "HKD"),
      asset.guid
    ),
    assetNonStdScu = None,
    code = "",
    description = "",
    hidden = false,
    placeholder = false
  )

  val hkusd = AccountCreation(
    AccountKey(
      name = "HSBC US",
      accountType = "Asset",
      assetId = AssetId(Currency, "USD"),
      parentGuid = asset.guid
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
    sourceValue = 40000,
    sourceCurrency = AssetId(Currency, "HKD"),
    targetValue = 5084.91,
    targetCurrency = AssetId(Currency, "USD")
  )

  val bohkd = BalanceObservation(
    id = java.util.UUID.randomUUID(),
    accountId = hkhkd.guid,
    date = LocalDate.parse("2019-01-01"), // post or enter?
    value = 138668.37,
    currency = AssetId(Currency, "HKD")
  )

  val bohkd2 = BalanceObservation(
    id = java.util.UUID.randomUUID(),
    accountId = hkhkd.guid,
    date = LocalDate.parse("2014-01-04"), // post or enter?
    value = 33030.33,
    currency = AssetId(Currency, "HKD")
  )

  "transfer" should "calc fx rate" in {
    val fx = tx.fxRate
    assert(fx == 0.12712275)
    assert (fx.denominatorIsValidLong)
    //assert ((1/fx) == 7.8664)
  }
}