package com.gainstrack.core.test

import com.gainstrack.core._
import org.scalatest.flatspec.AnyFlatSpec

class TestPositionSet extends AnyFlatSpec {
  val empty: PositionSet = PositionSet()
  val someUsd: Amount = Amount.parse("10 USD")
  val someGbp: Amount = Amount.parse("6 GBP")
  "PositionSet" should "add balances" in {
    val more = empty+someUsd+someGbp
    val expected: Map[AssetId, Fraction]  = Map(AssetId("GBP")->6, AssetId("USD")->10)
    assert(more.assetBalance == expected )
  }
  it should "subtract balances" in {
    val more = empty+someUsd-someGbp
    val expected: Map[AssetId, Fraction]  = Map(AssetId("GBP")-> -6, AssetId("USD")->10)
    assert(more.assetBalance == expected )
  }

  it should "add position sets" in {
    val more = empty + someUsd + someGbp
    val doubleMore = more + more
    val expected: Map[AssetId, Fraction]  = Map(AssetId("GBP")-> 12, AssetId("USD")->20)
    assert(doubleMore.assetBalance == expected )
  }

  it should "subtract positionSets" in {
    val more = empty+someUsd+someUsd-someUsd-someGbp
    val expected: Map[AssetId, Fraction]  = Map(AssetId("GBP")-> -6, AssetId("USD")->10)
    assert(more.assetBalance == expected )
  }

}
