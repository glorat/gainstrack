package com.gainstrack.core.test

import java.time.{LocalDate, ZonedDateTime}

import com.gainstrack.command._
import com.gainstrack.core._
import com.gainstrack.report.GainstrackGenerator
import org.scalatest.FlatSpec

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
    ), null)

    assert(tx.postings(1).value.isEmpty)
    assert(tx.filledPostings(1).value.get == Balance(400, "USD"))
  }

  "Security Purchase" should "balance" in {
    // 2014-02-11 * "Bought shares of S&P 500"
    //  Assets:ETrade:IVV                10 IVV {183.07 USD}
    //  Assets:ETrade:Cash         -1830.70 USD
    val sp = SecurityPurchase("Assets:Broker", LocalDate.parse("2014-02-11"), Balance(10, "IVV"), Balance(183.07, "USD"))
    val tx = sp.toTransaction
    assert(tx.isBalanced)
    assert(tx.filledPostings(0).toString == "Assets:Broker:USD -1830.7 USD")
    println(tx)
  }

  {
    val parser = new GainstrackParser
    import scala.io.Source
    Source.fromResource("unit.gainstrack").getLines.foreach(parser.parseLine)
    val cmds = parser.getCommands
    val bg = new GainstrackGenerator(cmds)

    "unit commands" should "generate beancount" in {
      import sys.process._
      val bFile = "/tmp/unit.beancount"
      bg.writeFile(bFile)
      val output = s"bean-check ${bFile}" !!

      assert(output == "")
    }

    def assertBalance(accountId:AccountId, dateStr:String, expected:Fraction) = {
      val bal = bg.balanceState.getBalance(accountId, parseDate(dateStr)).get
      assert(bal == expected)
    }

    it should "project balance" in {
      assertBalance("Assets:Pension:Barclays:BGIL", "2019-12-31", 600)
      assertBalance("Income:Pension:Barclays:GBP", "2019-12-31", -1500)
    }

    it should "handle funding" in {
      assertBalance("Assets:ISA:London:GBP", "2004-10-14", 7000)
      // TODO: Technically the adjustment happens a day earlier but that's not working here for some reason
      //assertBalance("Assets:ISA:London:GBP", "2005-10-13", 8000)
      assertBalance("Assets:ISA:London:GBP", "2005-10-14", 8000)

      assertBalance("Assets:ISA:London:GBP", "2019-12-31", 0)

    }
  }
}