package com.gainstrack.core.test

import java.time.{LocalDate, ZonedDateTime}

import com.gainstrack.core._
import org.scalatest.FlatSpec
import AssetType._

class TransactionBalanceTest extends FlatSpec {

  "Postings" should "have correct weight" in {
    /*
      Account       10.00 USD                       -> 10.00 USD
  Account       10.00 CAD @ 1.01 USD            -> 10.10 USD
  Account       10 SOME {2.02 USD}              -> 20.20 USD
  Account       10 SOME {2.02 USD} @ 2.50 USD   -> 20.20 USD
     */
//
    val p1 = Posting("Asset:Account", Balance(10,"USD"))
    assert(p1.weight == Balance(10, "USD"))
    assert(p1.toString == "Asset:Account 10.0 USD")
    val p2 = Posting("Asset:Account", Balance(10.00, "CAD"), Balance(1.01, "USD"))
    assert(p2.weight == Balance(10.10, "USD"))
    assert(p2.toString == "Asset:Account 10.0 CAD @1.01 USD")
    val p3 = Posting.withCost("Asset:Account", Balance(10, "SOME"), Balance(2.02, "USD"))
    assert(p3.weight == Balance(20.20, "USD"))
    assert(p3.toString == "Asset:Account 10.0 SOME {2.02 USD}")
    val p4 = Posting.withCostAndPrice("Asset:Account", Balance(10, "SOME"), Balance(2.02, "USD"), Balance(2.50, "USD"))
    assert(p4.weight == Balance(20.20, "USD"))
    assert(p4.toString == "Asset:Account 10.0 SOME {2.02 USD} @2.5 USD")
  }

  "Transactions" should "interpolate one posting" in {
    //2012-11-03 * "Transfer to pay credit card"
    //  Assets:MyBank:Checking            -400.00 USD
    //  Liabilities:CreditCard
    val tx = Transaction("2012-11-03", "Transfer to pay credit card", Seq(
      Posting("Assets:MyBank:Checking", Balance(-400.00, "USD")),
      Posting("Assets:MyBank:Checking")
    ))

    assert(tx.postings(1).value.isEmpty)
    assert(tx.filledPostings(1).value.get == Balance(400, "USD"))
  }
}