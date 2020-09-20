package com.gainstrack.core.test

import java.time.{LocalDate, YearMonth}

import com.gainstrack.command.{AccountCreation, BalanceAdjustment, GainstrackParser, GlobalCommand, Transfer}
import com.gainstrack.core._
import com.gainstrack.report._
import org.scalatest.flatspec.AnyFlatSpec

import scala.collection.SortedSet

class First extends AnyFlatSpec {
  val parser = new GainstrackParser
  import scala.io.Source
  parser.parseLines(Source.fromResource("src.gainstrack").getLines)

  val cmds = parser.getCommands
  val today = parseDate("2019-12-31")

  val tx = Transfer.parse("2019-01-02 tfr Assets:HSBCHK Assets:Investment:HSBC:USD 40000 HKD 5084.91 USD")

  "parser" should "roundtrip" in {
    cmds.foreach(cmd => {
      val p = new GainstrackParser
      val strs = cmd.toGainstrack
      p.parseLines(strs)

      assert(cmd == p.getCommands.last)

    })
  }

  it should "set a global operating currency" in {
    assert(bg.globalCommand.operatingCurrency == AssetId("GBP"))
  }

  it should "roundtrip multiline account opening" in {
    val lines = Seq("2010-01-01 open Income:Salary:CNY CNY", "  fundingAccount: Assets:HSBCCN")
    val p = new GainstrackParser
    p.parseLines(lines)
    assert(p.getCommands.size == 1)
    val cmd = p.getCommands.toSeq(0).asInstanceOf[AccountCreation]
    assert(cmd.options.fundingAccount == Some(AccountId("Assets:HSBCCN")))
    assert(cmd.toGainstrack == lines)
  }

  it should "extract global command" in {
    val cmd = cmds.head
    assert(cmd.isInstanceOf[GlobalCommand])
    assert(cmd.asInstanceOf[GlobalCommand].operatingCurrency == AssetId("GBP"))
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
      adjAccount = AccountId("Equity:Opening:HKD"),
      myOrigin = None
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
    assert(newAccounts.size == 10)
  }

  it should "generate asset conversion chains" in {
    val assetChainMap = bg.assetChainMap
    assert(assetChainMap(AccountId("Assets")) == Seq(AssetId("GBP")))
    assert(assetChainMap(AccountId("Assets:Investment:IBUSD:VWRD")).map(_.symbol) == Seq("VWRD","USD","GBP"))
  }

  val bg = GainstrackGenerator(cmds)

  val accountMap = bg.acctState.accountMap

  it should "generate beancount file" in {
    val errs = bg.writeBeancountFile("/tmp/gainstrack.beancount", parser.lineFor(_))
    assert(errs.length == 0)
  }

  it should "generate sane beancount string" in {
    val str = bg.toGainstrack
    assert (str.startsWith("option \"operating_currency\" \"GBP\"\n\n2000-01-01 open Assets:Bank:HSBCUK GBP\n\n2000-01-01 open Assets:Bank:Nationwide GBP"))
  }

  it should "pass bean-check" in {
    import sys.process._
    import java.nio.file.{Paths, Files}
    val bcFile = "/tmp/gainstrack.beancount"
    var stdout = scala.collection.mutable.ListBuffer[String]()
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

  it should "generate json allstate" in {
    import java.nio.file.{Files, Paths}
    import java.nio.charset.StandardCharsets
    import org.json4s._
    import org.json4s.jackson.Serialization.write
    implicit val jsonFormats: Formats = org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all addKeySerializers GainstrackJsonSerializers.allKeys
    val str = write(bg.allState)
    val filename = "/tmp/first.json"
    Files.write(Paths.get(filename), str.getBytes(StandardCharsets.UTF_8))
  }

  lazy val priceState : PriceState = bg.priceState
  lazy val priceFXConverter : PriceFXConverter = bg.priceFXConverter

  {
    val bp = bg.balanceState


    "BalanceProjector" should "project balances" in {

      // After commissions, should be 172.05
      assert(bp.balances("Assets:Investment:IBUSD:USD").series.last._2 == 172.05)
      assert(bp.balances("Expenses:Investment:IBUSD:USD").series.last._2 == 18.87)
    }


    it should "list balances by account" in {
      val today = parseDate("2019-12-31")
      val chainMap = bg.assetChainMap

      acctState.accounts.toSeq.sortBy(_.name).foreach(account => {
        val value = bp.getAccountValue(account.accountId, today)
        val toGbp = bp.getPosition(account.accountId, today, AssetId("GBP"), chainMap(account.accountId), bg.priceFXConverter)

        println(s"${account.accountId}: ${value.toDouble} ${account.key.assetId.symbol} ${toGbp}")

              })
    }

    it should "sum all asset balances to a position set" in {
      val assets = acctState.accounts.filter(_.name.accountType == Assets).foldLeft(PositionSet())((ps,account) => {
        val value:Fraction = bp.getAccountValue(account.accountId, today)
         ps + Amount(value, account.key.assetId.symbol)
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
    assert(priceState.prices.size == 34)

  }

  it should "infer prices from transfers" in {

    assert(priceState.prices(AssetPair(AssetId("USD"),AssetId("HKD")))
      == Map(parseDate("2019-01-02")-> 7.866412581540283))

    assert(priceState.prices(AssetPair(AssetId("VTI"),AssetId("USD"))) == Map(
      parseDate("2019-01-02") ->127.63,
      parseDate("2019-03-15") -> 144.62,
      parseDate("2019-03-26") -> 143.83)
    )
  }

  it should "include directly observed prices" in {
    assert(priceState.prices(AssetPair(AssetId("GBP"),AssetId("USD")))
      == Map(parseDate("2019-01-01")-> 1.2752))
  }

  it should "provide interpolated prices" in {
    val fx = priceFXConverter.getFX(AssetId("VTI"),AssetId("USD"), parseDate("2019-02-01"))
    // Interp between 127 and 144
    assert(fx.get ==  161651.0/1200.0) //134.709166666
  }

  it should "have a list of all ccys" in {
    // Two sanity tests that depend on the data
    assert(priceFXConverter.ccys.size == 18)
    assert(priceFXConverter.ccys.contains(AssetId("USD")))
    // This is the true invariant that should hold
    assert(priceFXConverter.prices.keys.map(_.fx1).toSet == priceState.ccys.map(_.symbol))
  }

  it should "compute shortest paths to base" in {
    val lookup = priceState.toGraph
    val res = Dijkstra.shortestPath[String](lookup, "VWRD", "GBP")
    assert(res._1 == 2.0) // Distance
    assert(res._2 == Seq("VWRD", "USD", "GBP"))
  }

  "IRR Calc" should "compute IRR" in {
    val accountId = AccountId("Assets:Investment:Zurich")
    val queryDate = LocalDate.parse("2019-12-31")
    val fromDate = parseDate("1980-01-01")

    val accountReport = new AccountInvestmentReport(accountId, AssetId("GBP"), fromDate, queryDate, bg.acctState, bg.balanceState, bg.txState, priceFXConverter)

    // Because we are doing FX with linear interpolation, rounding errors will happen
    // The conversions here will make this equal
    assert(accountReport.endBalance.number == 348045.34)
    // But this will be out be a nominal amount
    //assert(accountReport.endBalance == Amount.parse("348045.34 GBP"))
    assert(accountReport.endBalance.number.limitDenominatorTo(1000000) == Amount.parse("348045.34 GBP").number)

    // Note how this excludes the internal income transaction
    assert(accountReport.inflows == Seq(Cashflow("2013-06-30", "-265000.0 GBP", AccountId("Equity:Opening:GBP"))))

    // Do a an NPV=0 solve to find irr
    val irr = accountReport.irr
    val npv = accountReport.npv(irr)
    assert(npv < 0.000001)
    assert( Math.abs(irr - 0.04278473708136136) < 0.01)
  }

  "BalanceReport" should "project balances" in {
    // Values in these assertions match higher up values
    val fn:AccountId=>Fraction = bg.balanceState.totalPosition(_, bg.latestDate).assetBalance(AssetId("USD"))
    assert(fn("Assets:Investment:IBUSD:USD") == 172.05)
    assert(fn("Expenses:Investment:IBUSD:USD")== 18.87)
    assert(fn("Assets") == -52857.23)

  }

  it should "project converted" in {
    val balanceReport = BalanceReport(bg.txState.cmds)
    val dailyReport = new DailyBalance(bg.balanceState)

    val testMeStrategy:( String)=>(String, String, Int)=>Unit = (strategy) => (acctId, ccyStr, expected) => {
      val ps = dailyReport.convertedPosition(acctId, today, strategy)(bg.acctState, assetChainMap = bg.assetChainMap, bg.tradeFXConversion)
      val ps2 = balanceReport.getState.convertedPosition(acctId, today, strategy)(bg.assetChainMap, bg.acctState, bg.priceFXConverter, bg.tradeFXConversion)

//      if (ps != ps2) {
      ////        assert(ps == ps2)
      ////      }


      val actual1 = ps.assetBalance(AssetId(ccyStr)).round
      val actual2 = ps2.assetBalance(AssetId(ccyStr)).round

      assert(actual1 == expected)
      assert(actual2 == expected)
    }

    val testMe:(String, String, Int)=>Unit = testMeStrategy("parent")

    testMe("Assets:Investment:IBUSD:USD", "USD", 172)
    testMe("Expenses:Investment:IBUSD:USD", "USD", 19)
    testMe("Assets:Investment:IBUSD", "USD", 34960)

    // GBP is the operating currency
    assert(bg.acctState.baseCurrency.symbol == "GBP")
    testMe("Assets:Investment", "GBP", 433653)
    testMe("Assets", "GBP", 625582)

    val testMe2:(String, String, Int)=>Unit = testMeStrategy("GBP")

    testMe2("Assets:Investment:IBUSD:USD", "GBP", 135)
    testMe2("Assets", "GBP", 625582)

    val testMe3 = testMeStrategy("units")
    testMe3("Assets:Investment:IBUSD", "USD", 172)

    // This additional test is needed for a non-base ccy conversion
    val testMe4 = testMeStrategy("USD")
    testMe4("Assets:Investment:IBUSD", "USD", 34960)
    testMe4("Assets", "USD", 797742)
  }


  it should "show balances by asset tags" in {
    val dailyReport = new DailyBalance(bg.balanceState)
    //val equities = bg.assetState.tagToAssets("equity")
    val equities = bg.assetState.assetsForTags(Set("equity"))
    implicit val singleFXConversion = bg.tradeFXConversion
//    val equityValue = dailyReport.positionOfAssets(equities, bg.acctState, bg.priceFXConverter, bg.assetChainMap, today)
    //
    //    assert(equityValue.getBalance(AssetId("GBP")).number.round == 22211)

    val equityValue = bg.networth(today).filter(equities.toSeq).convertTo(AssetId("GBP"), bg.tradeFXConversion, today)
    assert(equityValue.getBalance(AssetId("GBP")).number.round == 22211)

  }

  it should "show empty balance for unknown asset tags" in {
    val dailyReport = new DailyBalance(bg.balanceState)
    val equities = bg.assetState.assetsForTags(Set("equity", "unknown"))
    implicit val singleFXConversion = bg.tradeFXConversion

    val equityValue = bg.networth(today).filter(equities.toSeq).convertTo(AssetId("GBP"), bg.tradeFXConversion, today)
    assert(equityValue.getBalance(AssetId("GBP")).number.round == 0)
  }

  it should "generate daily time series of balances" in {
    val dailyReport = new DailyBalance(bg.balanceState)
    val startDate = bg.acctState.accounts.map(_.date).min
    // Every 30 days
    val range = startDate.toEpochDay.until(today.toEpochDay, 30).map(LocalDate.ofEpochDay)
    val acct = AccountId("Assets")

    for (dt <- range) {
      val x = dailyReport.convertedPosition(acct, dt, "GBP")(bg.acctState, assetChainMap = bg.assetChainMap, bg.tradeFXConversion)
    }
  }

  it should "generate monthly time series of balances" in {
    val dailyReport = new DailyBalance(bg.balanceState)
    val start = YearMonth.from(bg.acctState.accounts.map(_.date).min)
    val it =Iterator.iterate(start)(_.plusMonths(1)).takeWhile(!_.isAfter(YearMonth.now))
    val dates = for (ym <- it) yield ym.atDay(1)
    val acct = AccountId("Assets")

    dates.foreach(date => {
      dailyReport.convertedPosition(acct, date, "GBP")(bg.acctState, assetChainMap = bg.assetChainMap, bg.tradeFXConversion)
    })
  }

  "Assets" should "support arbitrary options" in {
    val asset = bg.assetState.allAssets(AssetId("VWRD"))
    assert(asset.options.options("arbitrary") == "hello world")
  }

  it should "map to tickers" in  {
    assert(bg.fxMapper(AssetId("VWRD")) == AssetId("VWRD.LON") )
  }

  "Networth Report" should "report per asset" in {
    val ret = NetworthReport.byAsset(bg.latestDate, bg.acctState.baseCurrency)(accountState = acctState, balanceState = bg.balanceState, assetState = bg.assetState, singleFXConverter = bg.tradeFXConversion)
    val iuaa = ret.rows.find(_.assetId == AssetId("IUAA")).get
    assert(iuaa.units == 1000)
    assert(iuaa.value.round == 4097)
  }

  it should "report the same by tx summation" in {
    val ret = NetworthReport.byAsset2(bg.latestDate, bg.acctState.baseCurrency)(accountState = acctState, txState = bg.txState, assetState = bg.assetState, singleFXConverter = bg.tradeFXConversion)
    val iuaa = ret.rows.find(_.assetId == AssetId("IUAA")).get
    assert(iuaa.units == 1000)
    assert(iuaa.value.round == 4097)
  }
}