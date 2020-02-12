package controllers

import java.time.{Duration, Instant, LocalDate}
import java.time.format.DateTimeParseException

import com.gainstrack.command.{AccountCreation, GainstrackParser, ParserMessage}
import com.gainstrack.core._
import com.gainstrack.quotes.av.{Main, QuoteConfig}
import com.gainstrack.report.{AccountInvestmentReport, BalanceReport, DailyBalance, FXChain, FXProxy, GainstrackGenerator, IrrSummary, PLExplain, PLExplainDTO, TimeSeries}
import com.gainstrack.web.{AuthenticationSupport, BalanceTreeTable, GainstrackJsonSerializers, GainstrackSupport, StateSummaryDTO, TimingSupport}
import org.json4s.{DefaultFormats, Formats, JValue}
import org.scalatra.{NotFound, ScalatraServlet}
import org.scalatra.json._
import org.slf4j.LoggerFactory

import scala.concurrent.ExecutionContext



class ApiController (implicit val ec :ExecutionContext)
  extends ScalatraServlet
    with JacksonJsonSupport
    with AuthenticationSupport
    with GainstrackSupport
    with TimingSupport {
  val logger =  LoggerFactory.getLogger(getClass)
  logger.info("ApiController constructed")

  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all

  private def currentDate: LocalDate = {
    // TODO: Pull the clock from the user's profile timezone
    dateOverride.getOrElse(LocalDate.now())
  }

  val defaultFromDate = parseDate("1900-01-01")


  before() {
    contentType = formats("json")
    scentry.authenticate()
  }

  protected override def transformRequestBody(body: JValue): JValue = body.camelizeKeys

  def tables(keys:Seq[String]) = {
    val bg = getGainstrack
    val conversionStrategy = session.get("conversion").map(_.toString).getOrElse("parent")

    val toDate = currentDate
    val treeTable = new BalanceTreeTable(toDate, conversionStrategy, _=>true)(bg.acctState, bg.priceFXConverter, bg.assetChainMap, bg.dailyBalances, bg.singleFXConversion)

    keys.map(key => key -> treeTable.toTreeTable(AccountId(key))).toMap
  }

  get ("/balances/") {
    //contentType
    tables(Seq("Assets","Liabilities","Equity","Income","Expenses"))

  }

  get ("/balance_sheet/") {
    //contentType
    tables(Seq("Assets","Liabilities","Equity"))

  }

  get ("/income_statement/") {
    //contentType
    tables(Seq("Income","Expenses"))
  }

  get ("/prices/") {
    val bg = getGainstrack

    val priceState = bg.priceState

    val fxConvert = new FXProxy(bg.fxMapper, ServerQuoteSource.db.singleFxConverter(bg.acctState.baseCurrency))

    priceState.toDTOWithQuotes(fxConvert)

  }

  get ("/assets") {
    val bg = getGainstrack
    bg.assetState.toDTO.sortBy(_.asset.map(_.symbol).getOrElse(""))
  }

  get("/irr/") {
    val bg = getGainstrack

    var fromDate = defaultFromDate
    var toDate = currentDate

    if (params.contains("time") && params("time").matches(raw"\d{4}")) {
      fromDate =  LocalDate.of(Integer.parseInt(params("time")),1,1)
      toDate = fromDate.plusYears(1)
    }

    val fxConvert = new FXChain(
      new FXProxy(bg.fxMapper, ServerQuoteSource.db.singleFxConverter(bg.acctState.baseCurrency)),
      bg.singleFXConversion
    )
    // val fxConvert = bg.priceFXConverter

    val irr = IrrSummary(bg.finalCommands, fromDate, toDate, bg.acctState, bg.balanceState, bg.txState, fxConvert, bg.assetChainMap)

    irr.toSummaryDTO
  }

  get("/irr/:accountId") {
    val bg = getGainstrack

    val fxConvert = new FXChain(
      new FXProxy(bg.fxMapper, ServerQuoteSource.db.singleFxConverter(bg.acctState.baseCurrency)),
      bg.singleFXConversion
    )
//     val fxConvert = bg.priceFXConverter


    val accountId = params("accountId")
    val fromDate = defaultFromDate
    val toDate = currentDate
    bg.acctState.accountMap.get(accountId).map(account => {
      val accountReport = new AccountInvestmentReport(accountId, account.key.assetId, fromDate,  toDate, bg.acctState, bg.balanceState, bg.txState, fxConvert, bg.assetChainMap)
      val cfs = accountReport.cashflowTable.sorted
      TimeSeries(accountId, cfs.map(_.value.ccy.symbol), cfs.map(_.date.toString),
        cfs.map(_.value.number.toDouble.formatted("%.2f")),
        Some(cfs.map(_.convertedValue.get.number.toDouble.formatted("%.2f"))),
        cfs.map(_.source.toString))
    }).getOrElse(NotFound(s"${accountId} account not found"))
  }

  get("/editor/") {
    val bg = getGainstrack

    val source = bg.toGainstrack
    Map("source" -> source, "short_title" -> "Editor")
  }

  get("/account/:accountId") {
    val bg = getGainstrack

    val conversionStrategy = session.get("conversion").map(_.toString).getOrElse("parent")


    val accountId : AccountId = params("accountId")


    //bg.acctState.accountMap.get(accountId).map(account => {
    val txs = bg.txState.txsUnderAccount(accountId)

    // In reverse chrono order
    val commands = txs.map(_.origin).distinct.reverse

    val balanceFor : AccountCommand => PositionSet = {cmd =>

      val myTxs = txs.takeWhile(_.origin != cmd) ++ txs.filter(_.origin == cmd)
      /*
       For units report...

              val mypostings = mytxs.flatMap(_.filledPostings).filter(_.account.isSubAccountOf(accountId))
              val balance = mypostings.foldLeft(PositionSet())(_ + _.value.get)
              balance*/
      val balanceReport = BalanceReport(myTxs)
      balanceReport.getState.convertedPosition(accountId, cmd.date, conversionStrategy)(bg.assetChainMap, bg.acctState, bg.priceFXConverter, bg.singleFXConversion)
    }

    val deltaFor : AccountCommand => PositionSet = {cmd =>
      val myTxs = txs.filter(_.origin == cmd)
      val state = new DailyBalance(bg.balanceState)
      val balanceReport = BalanceReport(myTxs)
      balanceReport.getState.convertedPosition(accountId, cmd.date, conversionStrategy)(bg.assetChainMap, bg.acctState, bg.priceFXConverter, bg.singleFXConversion)
    }

    val rows = commands.map(cmd => {
      val myTxs = txs.filter(_.origin == cmd)
      val postings = myTxs.flatMap(_.filledPostings)
      AccountTxDTO(cmd.date.toString, cmd.commandString, cmd.description, deltaFor(cmd).toString, balanceFor(cmd).toString, postings)
    })
    AccountTxSummaryDTO(accountId.toString, rows)
  }

  get("/account/:accountId/graph") {
    val bg = getGainstrack

    val conversionStrategy = session.get("conversion").map(_.toString).getOrElse("parent")
    val toDate = currentDate
    val accountId : AccountId = params("accountId")
    val dailyBalance = DailyBalance(bg.balanceState)
    dailyBalance.monthlySeries(accountId, conversionStrategy, toDate, bg.acctState, bg.priceFXConverter, bg.assetChainMap, bg.singleFXConversion)
  }

  get ("/journal/") {
    val bg = getGainstrack

    val fxConvert = new FXChain(
      new FXProxy(bg.fxMapper, ServerQuoteSource.db.singleFxConverter(bg.acctState.baseCurrency)),
      bg.singleFXConversion
    )

    val txs = bg.txState.allTransactions
    val commands = txs.map(_.origin).distinct.reverse
    val multFn:AccountType=>Double = _ match {case Assets | Liabilities => 1.0; case _ => 0.0}
    val rows = commands.map(cmd => {
      val myTxs = txs.filter(_.origin == cmd)
      val postings = myTxs.flatMap(_.filledPostings)
      val txPnl:Double = myTxs.map(tx => tx.pnl(singleFXConverter = fxConvert, tx.postDate, bg.acctState.baseCurrency, multFn )).sum
      AccountTxDTO(cmd.date.toString, cmd.commandString, cmd.description, txPnl.formatted("%.2f") , "", postings)
    })
    JournalDTO(rows)
  }

  get ("/command/") {
    val bg = getGainstrack

    val mainAccountIds:Set[AccountId] = bg.finalCommands.flatMap(_.mainAccount).toSet
    val mainAccounts:Seq[AccountCreation] = bg.acctState.accounts.filter(a => mainAccountIds.contains(a.accountId)).toSeq.sortBy(_.accountId)

    mainAccounts
  }

  get ("/command/:accountId") {
    val bg = getGainstrack

    val accountId = params("accountId")
    bg.acctState.accountMap.get(accountId).map(account => {

      val commands = bg.originalCommands
        .filter(cmd => cmd.hasMainAccount(Some(accountId)))
          .toSeq
          .reverse

      Map("account" -> account, "commands" -> commands.map(cmd =>
        cmd.toDTO
      ))
    }).getOrElse(NotFound(s"${accountId} account not found"))
  }

  get ("/state/summary") {
    this.getSummary
  }

  post("/state/conversion") {
    // val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    session("conversion") = (parsedBody \ "conversion").extract[String]
    ApiSourceResponse(Seq(), Seq())
  }

  post("/state/dateOverride") {
    try {
      val dt:LocalDate = LocalDate.parse((parsedBody \ "dateOverride").extract[String])
      session("dateOverride") = dt
      ApiSourceResponse(Seq(), Seq())
    }
    catch {
      case e: Exception => {
        session.remove("dateOverride")
        ApiSourceResponse(Seq(), Seq())
      }
    }
  }

  get("/aa") {
    val bg = getGainstrack
    implicit val singleFXConversion = bg.singleFXConversion

    val queryDate = currentDate

    val allocations = Seq(Seq("equity"), Seq("bond"))
    val labels = allocations.map(_.mkString("/"))

    val values = allocations.map(a => {
      val allocationAssets = bg.assetState.assetsForTags(a.toSet)
      val allocationValue = bg.dailyBalances.positionOfAssets(allocationAssets, bg.acctState, bg.priceFXConverter, bg.assetChainMap, queryDate)
      allocationValue.getBalance(bg.acctState.baseCurrency)
    })
    val valueNum = values.map(_.number.toDouble)

    Map(
      "series" -> valueNum,
      "labels" -> labels,
      "ccy" -> bg.acctState.baseCurrency.symbol
    )

  }

  get ("/aa/table") {
    val bg = getGainstrack

    val toDate = currentDate
    val allocations = Seq(Seq("equity"), Seq("bond"), Seq("blend"))
    val tables = allocations.map(alloc => {
      val allocationAssets = bg.assetState.assetsForTags(alloc.toSet)
      val name = alloc.mkString("/")

      val filter: (AccountCreation=>Boolean) = acct => allocationAssets.contains(acct.key.assetId)
      val treeTable = new BalanceTreeTable(toDate, "global", filter)(bg.acctState, bg.priceFXConverter, bg.assetChainMap, bg.dailyBalances, bg.singleFXConversion)
      Map("name" -> name, "rows" -> treeTable.toTreeTable(AccountId("Assets")))
    })
    tables
  }

  get("/pnlexplain") {
    val bg = getGainstrack

    val fxConvert = new FXChain(
      new FXProxy(bg.fxMapper, ServerQuoteSource.db.singleFxConverter(bg.acctState.baseCurrency)),
      bg.singleFXConversion
    )

    val baseDate = dateOverride.getOrElse(bg.latestDate)

    val dates = Seq(
      baseDate.minusDays(1),
      baseDate.minusWeeks(1),
      baseDate.minusMonths(1),
      baseDate.minusMonths(3),
      baseDate.minusYears(1),
      baseDate.withDayOfYear(1))
    val descs = Seq("1d", "1w", "1m", "3m", "1y", "YTD")

    val pnls = dates.zip(descs).map(
      dtdesc => new PLExplain(dtdesc._1, baseDate)(bg.acctState, bg.txState, bg.balanceState, bg.priceFXConverter, bg.assetChainMap, fxConvert)
        .toDTO
        .withLabel(dtdesc._2)
    )
    pnls
  }

  get("/pnlexplain/monthly") {
    val bg = getGainstrack

    val fxConvert = new FXChain(
      new FXProxy(bg.fxMapper, ServerQuoteSource.db.singleFxConverter(bg.acctState.baseCurrency)),
      bg.singleFXConversion
    )
    val baseDate = dateOverride.getOrElse(bg.latestDate)

    val endDates = baseDate +: Range(0,11).map(n => baseDate.minusMonths(n).withDayOfMonth(1).minusDays(1))
    val startDates = endDates.map(_.minusDays(1).withDayOfMonth(1))
    import java.time.format.DateTimeFormatter
    val monthFmt = DateTimeFormatter.ofPattern("MMM")
    val descs = startDates.map(_.format(monthFmt))

    val exps = for (i<-0 to 11) yield {
      new PLExplain(startDates(i), endDates(i))(bg.acctState, bg.txState, bg.balanceState, bg.priceFXConverter, bg.assetChainMap, fxConvert)
        .toDTO
        .withLabel(descs(i))
    }
    val total = PLExplainDTO.total(exps)
    val avg = total.divide(exps.size).withLabel("avg")
    avg +: total +: exps
  }

  post("/pnlexplain") {
    val body = parsedBody.extract[PNLExplainRequest]
    val bg = getGainstrack
    val fxConvert = new FXChain(
      new FXProxy(bg.fxMapper, ServerQuoteSource.db.singleFxConverter(bg.acctState.baseCurrency)),
      bg.singleFXConversion
    )
    val pnl = new PLExplain(body.fromDate, body.toDate)(bg.acctState, bg.txState, bg.balanceState, bg.priceFXConverter, bg.assetChainMap, fxConvert)
    Seq(pnl.toDTO)
  }

  get("/history") {
    getHistory
  }

/*
  error {
    case e: Throwable => {

    }
  }*/
}

object ServerQuoteSource {
  val db = Main.doTheWork
}

//case class BalanceSheet(balanceSheet: Map[String,TreeTable])
case class ApiSourceRequest(filePath:String, entryHash:String, source:String, sha256sum: String)
case class ApiSourceResponse(errors: Seq[ParserMessage], added: Seq[AccountCommandDTO])

case class AccountTxSummaryDTO(accountId:String, rows:Seq[AccountTxDTO])
case class AccountTxDTO(date:String, cmdType:String, description:String, change: String, position:String, postings:Seq[Posting])

case class JournalDTO(rows:Seq[AccountTxDTO])



case class PNLExplainRequest(fromDate: LocalDate, toDate: LocalDate)