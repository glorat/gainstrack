package com.gainstrack.core.test

import java.time.LocalDate

import com.gainstrack.command.{BalanceAdjustment, Transfer}
import com.gainstrack.core._
import org.scalatest.FlatSpec

class First extends FlatSpec {
  val parser = new GainstrackParser
  import scala.io.Source
  Source.fromResource("src.gainstrack").getLines.foreach(parser.parseLine)

  val cmds = parser.getCommands

  val orderedCmds = cmds.sorted


  val tx = Transfer.parse("2019-01-02 tfr Assets:HSBCHK Assets:Investment:HSBC:USD 40000 HKD 5084.91 USD")

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
      dest = "Assets:Investment:HSBC:USD",
      date = LocalDate.parse("2019-01-02"),
      sourceValue = "40000 HKD",
      targetValue = "5084.91 USD"
    )

    assert(tx == tx2)
  }

  "adj" should "parse" in {

    val bohkd = BalanceAdjustment(
      accountId = "Assets:HSBCHK",
      date = LocalDate.parse("2019-01-01"), // post or enter?
      balance = "138668.37 HKD",
      adjAccount = "Equity:Opening:HKD"
    )

    assert(BalanceAdjustment.parse("2019-01-01 adj Assets:HSBCHK 138668.37 HKD Equity:Opening:HKD") == bohkd)
  }

  // First pass for accounts
  lazy val acctState:BeancountAccountState =
    orderedCmds.foldLeft(BeancountAccountState(Seq())) ( (state, ev) => state.handle(ev))


  "cmds" should "process" in {
    acctState
  }

  it should "parse account options" in {
    val acct = acctState.accounts.find(x => x.name == "Assets:Investment:IBUSD").getOrElse(fail("Missing account"))
    assert (acct.options.expenseAccount == Some("Expenses:Investment:Fees:USD"))
  }

  val bg = new BeancountGenerator(orderedCmds)

  val accountMap = bg.acctState.accountMap

  it should "generate beancount" in {

    val output = "option \"title\" \"Example Beancount file\"\noption \"operating_currency\" \"USD\"\n2010-01-01 open Equity:Opening:HKD HKD\n2010-01-01 open Equity:HSBCUS USD\n2010-01-01 open Assets:HSBCHK HKD\n2010-01-01 open Assets:HSBCUS USD\n2014-01-03 pad Assets:HSBCHK Equity:Opening:HKD\n2014-01-04 balance Assets:HSBCHK 33030.33 HKD\n2018-12-31 pad Assets:HSBCHK Equity:Opening:HKD\n2019-01-01 balance Assets:HSBCHK 138668.37 HKD\n2019-01-02 * \"\"\n  Assets:HSBCHK -40000.0 HKD @0.12712275 USD\n  Assets:HSBCUS 5084.91 USD\n"
    //assert (output == bg.toBeancount)
    import java.nio.file.{Paths, Files}
    import java.nio.charset.StandardCharsets

    val str = bg.toBeancount
    Files.write(Paths.get("/tmp/gainstrack.beancount"), str.getBytes(StandardCharsets.UTF_8))

  }

  lazy val priceCollector : PriceCollector = {
    val machine = new PriceCollector
    orderedCmds.foreach(cmd => {
      machine.applyChange(cmd)
    })
    machine
  }

  {
    val bp = new BalanceProjector(bg.acctState.accounts)
    for (elem <- orderedCmds) {
      bp.applyChange(elem)
    }
    val today = parseDate("2019-12-31")


    "BalanceProjector" should "project balances" in {

      // After commissions, should be 172.05
      assert(bp.getState.balances("Assets:Investment:IBUSD:USD").last._2 == 172.05)
      assert(bp.getState.balances("Expenses:Investment:Fees:USD").last._2 == 18.87)
    }


    it should "list balances by account" in {
      val today = parseDate("2019-12-31")
      acctState.accounts.sortBy(_.name).foreach(account => {
        val value = bp.getState.getBalance(account.accountId, today).getOrElse(zeroFraction)
        println(s"${account.accountId}: ${value.toDouble} ${account.key.assetId.symbol}")
      })
    }

    it should "sum all asset balances to a position set" in {
      val assets = acctState.accounts.filter(_.name.startsWith("Assets:")).foldLeft(PositionSet())((ps,account) => {
        val value:Fraction = bp.getState.getBalance(account.accountId, today).getOrElse(zeroFraction)
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
    priceCollector
  }

  it should "infer prices from transfers" in {
    assert(priceCollector.getState.prices.size == 32)

    assert(priceCollector.getState.prices(AssetTuple(AssetId("USD"),AssetId("HKD")))
      == Map(parseDate("2019-01-02")-> 7.866412581540283))

    assert(priceCollector.getState.prices(AssetTuple(AssetId("VTI"),AssetId("USD"))) == Map(
      parseDate("2019-01-02") ->127.63,
      parseDate("2019-03-15") -> 144.62,
      parseDate("2019-03-26") -> 143.83)
    )
  }

  it should "provide interpolated prices" in {
    val fx = priceCollector.getState.getFX(AssetTuple("VTI","USD"), parseDate("2019-02-01"))
    // Interp between 127 and 144
    assert(fx.get ==  161651.0/1200.0) //134.709166666
  }

  "IRR Calc" should "compute IRR" in {
    val accountId = "Assets:Investment:Zurich"
    val queryDate = LocalDate.parse("2019-12-31")

    val accountReport = new AccountReport(accountId, AssetId("GBP"), queryDate, bg, priceCollector)

    assert(accountReport.balance == Balance.parse("348045.34 GBP"))

    // Note how this excludes the internal income transaction
    assert(accountReport.inflows == Seq(Cashflow("2013-06-30", "-265000.0 GBP")))

    // Do a an NPV=0 solve to find irr
    val irr = accountReport.cashflowTable.irr
    val npv = accountReport.cashflowTable.npv(irr)
    assert(npv < 0.000001)
    assert(irr == 0.04278473708136136)
  }

}