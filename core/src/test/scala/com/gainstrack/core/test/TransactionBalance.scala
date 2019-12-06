package com.gainstrack.core.test

import java.io.{BufferedReader, StringReader}
import java.time.{LocalDate, ZonedDateTime}

import com.gainstrack.command._
import com.gainstrack.core._
import com.gainstrack.report.{AccountInvestmentReport, GainstrackGenerator, IrrSummary}
import org.scalatest.FlatSpec

import scala.collection.SortedSet

class TransactionAmountTest extends FlatSpec {

  "Postings" should "have correct weight" in {
    /*
      Account       10.00 USD                       -> 10.00 USD
  Account       10.00 CAD @ 1.01 USD            -> 10.10 USD
  Account       10 SOME {2.02 USD}              -> 20.20 USD
  Account       10 SOME {2.02 USD} @ 2.50 USD   -> 20.20 USD
     */
//
    val p1 = Posting("Asset:Account", Amount(10,"USD"))
    assert(p1.weight == Amount(10, "USD"))
    assert(p1.toString == "Asset:Account 10.0 USD")
    val p2 = Posting("Asset:Account", Amount(10.00, "CAD"), Amount(1.01, "USD"))
    assert(p2.weight == Amount(10.10, "USD"))
    assert(p2.toString == "Asset:Account 10.0 CAD @1.01 USD")
    val p3 = Posting.withCost("Asset:Account", Amount(10, "SOME"), Amount(2.02, "USD"))
    assert(p3.weight == Amount(20.20, "USD"))
    assert(p3.toString == "Asset:Account 10.0 SOME {2.02 USD}")
    val p4 = Posting.withCostAndPrice("Asset:Account", Amount(10, "SOME"), Amount(2.02, "USD"), Amount(2.50, "USD"))
    assert(p4.weight == Amount(20.20, "USD"))
    assert(p4.toString == "Asset:Account 10.0 SOME {2.02 USD} @2.5 USD")
  }

  "Transactions" should "interpolate one posting" in {
    //2012-11-03 * "Transfer to pay credit card"
    //  Assets:MyBank:Checking            -400.00 USD
    //  Liabilities:CreditCard
    val tx = Transaction("2012-11-03", "Transfer to pay credit card", Seq(
      Posting("Assets:MyBank:Checking", Amount(-400.00, "USD")),
      Posting("Assets:MyBank:Checking")
    ), null)

    assert(tx.postings(1).value.isEmpty)
    assert(tx.filledPostings(1).value.get == Amount(400, "USD"))
  }

  "Security Purchase" should "balance" in {
    // 2014-02-11 * "Bought shares of S&P 500"
    //  Assets:ETrade:IVV                10 IVV {183.07 USD}
    //  Assets:ETrade:Cash         -1830.70 USD
    val sp = SecurityPurchase("Assets:Broker", LocalDate.parse("2014-02-11"), Amount(10, "IVV"), Amount(183.07, "USD"))
    val tx = sp.toTransaction
    assert(tx.isBalanced)
    assert(tx.filledPostings(0).toString == "Assets:Broker:USD -1830.7 USD")
    println(tx)
  }

  {
    val parser = new GainstrackParser
    import scala.io.Source
    parser.parseLines(Source.fromResource("unit.gainstrack").getLines)
    val cmds = parser.getCommands
    val bg = new GainstrackGenerator(cmds)

    "unit commands" should "generate beancount" in {
      import sys.process._
      val bFile = "/tmp/unit.beancount"
      val res = bg.writeBeancountFile(bFile, parser.lineFor(_))
      assert(res.length == 0)
      val output = s"bean-check ${bFile}" !!

      assert(output == "")
    }

    it should "handle multi-asset accounts" in {
      val base = bg.acctState.find("Assets:Investment:Stocks").get
      assert(base.options.multiAsset)
      val sub = bg.acctState.find("Assets:Investment:Stocks:FTSE").get
      assert(sub.options.multiAsset == false)
    }


    def assertBalance(accountId:AccountId, dateStr:String, expected:Fraction) = {
      val bal = bg.balanceState.getAccountValue(accountId, parseDate(dateStr))
      assert(bal == expected)
    }

    val fromDate = parseDate("1980-01-01")
    val queryDateStr = "2019-12-31"

    it should "project balance" in {
      assertBalance("Assets:Pension:Barclays:BGIL", "2019-12-31", 600)
      assertBalance("Income:Pension:Barclays:GBP", "2019-12-31", -500)
    }

    it should "handle funding" in {
      assertBalance("Assets:ISA:London", "2004-10-14", 7000)
      // TODO: Technically the adjustment happens a day earlier but that's not working here for some reason
      //assertBalance("Assets:ISA:London:GBP", "2005-10-13", 8000)
      assertBalance("Assets:ISA:London", "2005-10-14", 8000)

    }

    it should "handle earn and simple earn" in {
      assertBalance("Income:Salary:GBP", "2005-07-26", -50000)
    }

    it should "handle bank asset yield interest" in {
      assertBalance("Assets:Bank:England",  "2005-07-26", 43000)
      assertBalance("Assets:Bank:England",  "2005-08-01", 43010)
    }

    it should "handle ISA interest yield into fundingAccount" in {
      assertBalance("Assets:Bank:England", "2005-11-01", 43025)
    }
    it should "handle dividend yield into trading cash account" in {
      assertBalance("Assets:Investment:Stocks:GBP", "2006-11-15", 19)
      assertBalance("Assets:Investment:Stocks:USD", "2006-11-15", 0)
    }


    it should "project IRR" in {
      val accountId = AccountId("Assets:ISA:London")
      val rep = new AccountInvestmentReport(accountId, AssetId("GBP"), fromDate, parseDate(queryDateStr), bg.acctState, bg.balanceState, bg.txState, bg.priceState, bg.assetChainMap)

      assert(rep.irr < 0.009)
      assert(rep.irr > 0.008)
    }

    it should "project IRR summary" in {
      val summary = IrrSummary(bg.finalCommands, fromDate, parseDate(queryDateStr), bg.acctState, bg.balanceState, bg.txState, bg.priceState, bg.assetChainMap)
      val rep = summary.accounts(AccountId("Assets:ISA:London"))
      assert(rep.irr < 0.009)
      assert(rep.irr > 0.008)
    }

    it should "generate original command strings" in {

      val strs = cmds.toSeq.flatMap(_.toGainstrack).mkString("\n")

      val secondParser = new GainstrackParser

      secondParser.parseLines(strs.split("\n"))

      secondParser.getCommands.zip(cmds).map(x => assert(x._1 == x._2))

      assert(secondParser.getCommands.toSeq == cmds.toSeq)
    }

    it should "generate sensible input file" in {
      bg.writeGainstrackFile("/tmp/unit.gainstrack")
    }
  }
}