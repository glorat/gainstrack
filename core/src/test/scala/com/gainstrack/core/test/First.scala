package com.gainstrack.core.test

import java.time.LocalDate

import com.gainstrack.command.{AccountCreation, BalanceAdjustment, GainstrackParser, Transfer}
import com.gainstrack.core._
import com.gainstrack.report._
import org.scalatest.FlatSpec

import scala.collection.SortedSet

class First extends FlatSpec {
  val parser = new GainstrackParser
  import scala.io.Source
  Source.fromResource("src.gainstrack").getLines.foreach(parser.parseLine)

  val cmds = parser.getCommands
  val today = parseDate("2019-12-31")

  val tx = Transfer.parse("2019-01-02 tfr Assets:HSBCHK Assets:Investment:HSBC:USD 40000 HKD 5084.91 USD")

  "parser" should "roundtrip" in {
    cmds.foreach(cmd => {
      val p = new GainstrackParser
      val strs = cmd.toGainstrack
      strs.foreach(p.parseLine(_))

      assert(p.getCommands.size == 1)
      assert(cmd == p.getCommands.head)

    })
  }

  "it" should "roundtrip multiline account opening" in {
    val lines = Seq("2010-01-01 open Income:Salary:CNY CNY", "  fundingAccount: Assets:HSBCCN")
    val p = new GainstrackParser
    lines.foreach(p.parseLine(_))
    assert(p.getCommands.size == 1)
    val cmd = p.getCommands.head.asInstanceOf[AccountCreation]
    assert(cmd.options.fundingAccount == Some(AccountId("Assets:HSBCCN")))
    assert(cmd.toGainstrack == lines)
  }

  "transfer" should "calc fx rate" in {
    val fx = tx.fxRate
    assert(fx == 0.12712275)
    assert (fx.denominatorIsValidLong)
    //assert ((1/fx) == 7.8664)
    assert(tx.toTransaction.isBalanced)
  }

  it should "parse" in {
    val tx2 = Transfer(
      source = AccountId("Assets:HSBCHK"),
      dest = AccountId("Assets:Investment:HSBC:USD"),
      date = LocalDate.parse("2019-01-02"),
      sourceValue = "40000 HKD",
      targetValue = "5084.91 USD"
    )

    assert(tx == tx2)
  }

  "adj" should "parse" in {

    val bohkd = BalanceAdjustment(
      accountId = AccountId("Assets:HSBCHK"),
      date = LocalDate.parse("2019-01-01"), // post or enter?
      balance = "138668.37 HKD",
      adjAccount = AccountId("Equity:Opening:HKD")
    )

    assert(BalanceAdjustment.parse("2019-01-01 adj Assets:HSBCHK 138668.37 HKD Equity:Opening:HKD") == bohkd)
  }

  // First pass for accounts
  lazy val acctState:AccountState = bg.acctState

  "cmds" should "process" in {
    acctState
  }

  it should "handle related accounts" in {
    val acct = acctState.accounts.find(x => x.name == AccountId("Assets:Investment:IBUSD")).getOrElse(fail("Missing account"))
    assert (acct.options.expenseAccount == Some(AccountId("Expenses:Investment:IBUSD:USD")))
  }

  it should "fill in intermediate accounts" in {
    val newState = acctState.withInterpolatedAccounts
    val newAccounts = newState.accounts.&~(acctState.accounts)
    newAccounts.foreach(a => println(s"${a.toBeancount}"))
    assert(newAccounts.size == 18)
  }

  val bg = GainstrackGenerator(cmds)

  val accountMap = bg.acctState.accountMap

  it should "generate beancount file" in {
    bg.writeBeancountFile("/tmp/gainstrack.beancount")
  }

  it should "generate sane beancount string" in {
    val str = bg.toGainstrack
    assert (str.startsWith("2019-01-01 price GBP 1.2752 USD\n\n2000-01-01 open Assets:Bank:HSBCUK GBP\n\n2000-01-01 open Assets:Bank:Nationwide GBP"))
  }

  it should "pass bean-check" in {
    import sys.process._
    import java.nio.file.{Paths, Files}
    val bcFile = "/tmp/gainstrack.beancount"
    var stdout = scala.collection.mutable.MutableList[String]()
    val logger = ProcessLogger(line => stdout.+=(line), line=>stdout+=line )
    val exitCode = s"bean-check ${bcFile}" ! logger

    if (exitCode != 0) {
      val errLines = stdout.filter(_.startsWith(bcFile))
      val BcParse = (bcFile + raw":([0-9]+):\s+(.*)").r
      val orig = bg.toBeancount
      errLines.foreach(line => {
        line match {
          case BcParse(lineNumber,message) => {
            println(orig(parseNumber(lineNumber).toInt-1).origin.toGainstrack)
            println (message)
          }
        }

      })

    }

    assert(exitCode == 0)
  }

  lazy val priceState : PriceState = bg.priceState

  {
    val bp = bg.balanceState


    "BalanceProjector" should "project balances" in {

      // After commissions, should be 172.05
      assert(bp.balances("Assets:Investment:IBUSD:USD").last._2 == 172.05)
      assert(bp.balances("Expenses:Investment:IBUSD:USD").last._2 == 18.87)
    }


    it should "list balances by account" in {
      val today = parseDate("2019-12-31")
      acctState.accounts.toSeq.sortBy(_.name).foreach(account => {
        val value = bp.getBalance(account.accountId, today).getOrElse(zeroFraction)
        println(s"${account.accountId}: ${value.toDouble} ${account.key.assetId.symbol}")
      })
    }

    it should "sum all asset balances to a position set" in {
      val assets = acctState.accounts.filter(_.name.accountType == Assets).foldLeft(PositionSet())((ps,account) => {
        val value:Fraction = bp.getBalance(account.accountId, today).getOrElse(zeroFraction)
         ps + Balance(value, account.key.assetId.symbol)
      }).assetBalance

      assert(assets(AssetId("USD")) == -52857.23)

    }
        /*
    it should "aggregate a tree of position sets" in {
      // Aggregate assets up the tree...
      var accountsToReduce = accountMap.keys
      var current = acctState.accounts.filter(_.name.startsWith("Assets:")).foldLeft(PositionSet())((ps,account) => {
        val value:Fraction = bp.getState.getBalance(account.accountId, today).getOrElse(zeroFraction)
        ps + Balance(value, account.key.assetId.symbol)
      }).assetBalance
      while (accountsToReduce.size > 0) {
        val parents = accountsToReduce.map(accountId => accountMap.get(accountId))

      }
    }
    */
  }




  "price collector" should "process" in {
    priceState
  }

  it should "infer prices from transfers" in {
    assert(priceState.prices.size == 32)

    assert(priceState.prices(AssetPair(AssetId("USD"),AssetId("HKD")))
      == Map(parseDate("2019-01-02")-> 7.866412581540283))

    assert(priceState.prices(AssetPair(AssetId("VTI"),AssetId("USD"))) == Map(
      parseDate("2019-01-02") ->127.63,
      parseDate("2019-03-15") -> 144.62,
      parseDate("2019-03-26") -> 143.83)
    )
  }

  it should "provide interpolated prices" in {
    val fx = priceState.getFX(AssetPair("VTI","USD"), parseDate("2019-02-01"))
    // Interp between 127 and 144
    assert(fx.get ==  161651.0/1200.0) //134.709166666
  }

  "IRR Calc" should "compute IRR" in {
    val accountId = AccountId("Assets:Investment:Zurich")
    val queryDate = LocalDate.parse("2019-12-31")
    val fromDate = parseDate("1980-01-01")

    val accountReport = new AccountInvestmentReport(accountId, AssetId("GBP"), fromDate, queryDate, bg.acctState, bg.balanceState, bg.txState, priceState)

    assert(accountReport.endBalance == Balance.parse("348045.34 GBP"))

    // Note how this excludes the internal income transaction
    assert(accountReport.inflows == Seq(Cashflow("2013-06-30", "-265000.0 GBP", AccountId("Equity:Opening:GBP"))))

    // Do a an NPV=0 solve to find irr
    val irr = accountReport.cashflowTable.irr
    val npv = accountReport.cashflowTable.npv(irr)
    assert(npv < 0.000001)
    assert( Math.abs(irr - 0.04278473708136136) < 0.01)
  }

  "BalanceReport" should "project balances" in {
    val balanceReport = BalanceReport(bg.txState.cmds)
    val state = balanceReport.getState
    // Values in these assertions match higher up values
    val fn:AccountId=>Fraction = state.totalPosition(_).assetBalance(AssetId("USD"))
    assert(fn("Assets:Investment:IBUSD:USD") == 172.05)
    assert(fn("Expenses:Investment:IBUSD:USD")== 18.87)
    assert(fn("Assets") == -52857.23)

  }

  it should "project converted" in {
    val balanceReport = BalanceReport(bg.txState.cmds)
    val state = balanceReport.getState
    val accounts = bg.acctState.withInterpolatedAccounts
    // Values in these assertions match higher up values
    val fn:AccountId=>Fraction = (acctId) => {
      val ps = state.convertedPosition(acctId, accounts, bg.priceState, today)
      ps.assetBalance(AssetId("USD"))
    }
    assert(fn("Assets:Investment:IBUSD:USD") == 172.05)
    assert(fn("Expenses:Investment:IBUSD:USD") == 18.87)
    assert(fn("Assets:Investment:IBUSD") == 34960.13)
    assert(fn("Assets:Investment") == 6768.23)
    assert(fn("Assets") == 6768.23)
  }
}