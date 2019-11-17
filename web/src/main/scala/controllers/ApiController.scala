package controllers

import java.time.LocalDate

import com.gainstrack.command.{AccountCreation, GainstrackParser, ParserMessage}
import com.gainstrack.core._
import com.gainstrack.report.{AccountInvestmentReport, BalanceReport, DailyBalance, GainstrackGenerator, IrrSummary, TimeSeries}
import org.json4s.{DefaultFormats, Formats, JValue}
import org.scalatra.{NotFound, ScalatraServlet}
import org.scalatra.json._

import scala.concurrent.ExecutionContext



class ApiController (implicit val ec :ExecutionContext) extends ScalatraServlet with JacksonJsonSupport {
  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all

  val bgDefault = {
    val parser = new GainstrackParser
    val realFile = "real"
    parser.parseFile(s"/Users/kevin/dev/gainstrack/data/${realFile}.gainstrack")
    val orderedCmds = parser.getCommands
    new GainstrackGenerator(orderedCmds)
  }


  val defaultFromDate = parseDate("1970-01-01")


  before() {
    contentType = formats("json")
  }

  protected override def transformRequestBody(body: JValue): JValue = body.camelizeKeys

  put("/source/") {
    val parser = new GainstrackParser
    try {
      val body = parsedBody.extract[ApiSourceRequest]

      val realFile = "real"
      parser.parseString(body.source)
      val orderedCmds = parser.getCommands
      val bg = new GainstrackGenerator(orderedCmds)
      val res = bg.writeBeancountFile(s"/tmp/${realFile}.beancount", parser.lineFor(_))
      if (res.length == 0) {
        session("gainstrack") = bg

        //val defaultFromDate = parseDate("1970-01-01")
        ApiSourceResponse("???", true, Seq())
      }
      else {
        ApiSourceResponse("???", false, res)
      }

    }
    catch {
      case e:Exception if parser.parserErrors.size>0 => {
        ApiSourceResponse("???", false, parser.parserErrors)
      }
      case e:Exception => ApiSourceResponse("???", false, Seq(ParserMessage(e.getMessage, 0, "")))
    }

  }

  def tables(keys:Seq[String]) = {
    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    val conversionStrategy = session.get("conversion").map(_.toString).getOrElse("parent")

    var toDate = LocalDate.now

    val balanceReport = DailyBalance(bg.balanceState)
    val acctState = bg.acctState.withInterpolatedAccounts
    val priceState = bg.priceState

    val treeTable = new BalanceTreeTable(bg.acctState, priceState, toDate, balanceReport, conversionStrategy)

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
    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    val priceState = bg.priceState

    priceState.toDTO

  }

  get("/irr/") {
    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]

    var fromDate = defaultFromDate
    var toDate = LocalDate.now

    if (params.contains("time") && params("time").matches(raw"\d{4}")) {
      fromDate =  LocalDate.of(Integer.parseInt(params("time")),1,1)
      toDate = fromDate.plusYears(1)
    }

    val irr = IrrSummary(bg.finalCommands, fromDate, toDate, bg.acctState, bg.balanceState, bg.txState, bg.priceState)

    irr.toSummaryDTO
  }

  get("/irr/:accountId") {
    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    val accountId = params("accountId")
    val fromDate = defaultFromDate
    bg.acctState.accountMap.get(accountId).map(account => {
      val accountReport = new AccountInvestmentReport(accountId, account.key.assetId, fromDate,  LocalDate.now(), bg.acctState, bg.balanceState, bg.txState, bg.priceState)
      val cfs = accountReport.cashflowTable.sorted
      TimeSeries(accountId, cfs.map(_.value.ccy.symbol), cfs.map(_.date.toString), cfs.map(_.value.value.toDouble.toString), cfs.map(_.source.toString))
    }).getOrElse(NotFound(s"${accountId} account not found"))
  }

  get("/editor/") {
    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    val source = bg.toGainstrack
    Map("source" -> source, "short_title" -> "Editor")
  }

  get("/account/:accountId") {

    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
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
      balanceReport.getState.convertedPosition(accountId, bg.acctState, bg.priceState, cmd.date, conversionStrategy)
    }

    val deltaFor : AccountCommand => PositionSet = {cmd =>
      val myTxs = txs.filter(_.origin == cmd)
      val state = new DailyBalance(bg.balanceState)
      val balanceReport = BalanceReport(myTxs)
      balanceReport.getState.convertedPosition(accountId, bg.acctState, bg.priceState, cmd.date, conversionStrategy)
    }

    val rows = commands.map(cmd => {
      val myTxs = txs.filter(_.origin == cmd)
      val postings = myTxs.flatMap(_.filledPostings)
      AccountTxDTO(cmd.date.toString, cmd.commandString, cmd.description, deltaFor(cmd).toString, balanceFor(cmd).toString, postings)
    })
    AccountTxSummaryDTO(accountId.toString, rows)
  }

  get("/account/:accountId/graph") {
    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    val conversionStrategy = session.get("conversion").map(_.toString).getOrElse("parent")
    val accountId : AccountId = params("accountId")
    val dailyBalance = DailyBalance(bg.balanceState)
    dailyBalance.monthlySeries(accountId, conversionStrategy, LocalDate.now, bg.acctState, bg.priceState)
  }

  get ("/journal/") {
    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    val txs = bg.txState.allTransactions
    val commands = txs.map(_.origin).distinct.reverse
    val rows = commands.map(cmd => {
      val myTxs = txs.filter(_.origin == cmd)
      val postings = myTxs.flatMap(_.filledPostings)
      AccountTxDTO(cmd.date.toString, cmd.commandString, cmd.description, "", "", postings)
    })
    JournalDTO(rows)
  }

  get ("/command/") {
    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]

    val mainAccountIds:Set[AccountId] = bg.finalCommands.flatMap(_.mainAccount).toSet
    val mainAccounts:Seq[AccountCreation] = bg.acctState.accounts.filter(a => mainAccountIds.contains(a.accountId)).toSeq.sortBy(_.accountId)

    mainAccounts
  }

  get ("/command/:accountId") {

    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]

    val accountId = params("accountId")
    bg.acctState.accountMap.get(accountId).map(account => {

      val commands = bg.originalCommands
        .filter(cmd => cmd.hasMainAccount(Some(accountId)))
          .toSeq
          .reverse

      Map("account" -> account, "commands" -> commands.map(cmd =>
        Map("data"->cmd,
          "type" -> cmd.commandString,
          "description" -> cmd.description)
      ))
    }).getOrElse(NotFound(s"${accountId} account not found"))
  }

  get ("/state/summary") {
    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    val accts = bg.acctState.accounts.map(_.accountId)
    val ccys = bg.priceState.ccys
    val conversionStrategy = session.get("conversion").map(_.toString).getOrElse("parent")

    StateSummaryDTO(accts.toSeq.sorted, ccys.toSeq.sorted, conversionStrategy)
  }

  post("/state/conversion") {
    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    session("conversion") = (parsedBody \ "conversion").extract[String]
    ApiSourceResponse("???", true, Seq())
  }


/*
  error {
    case e: Throwable => {

    }
  }*/
}
//case class BalanceSheet(balanceSheet: Map[String,TreeTable])
case class ApiSourceRequest(filePath:String, entryHash:String, source:String, sha256sum: String)
case class ApiSourceResponse(sha256sum:String, success:Boolean, errors: Seq[ParserMessage])

case class AccountTxSummaryDTO(accountId:String, rows:Seq[AccountTxDTO])
case class AccountTxDTO(date:String, cmdType:String, description:String, change: String, position:String, postings:Seq[Posting])

case class JournalDTO(rows:Seq[AccountTxDTO])

case class StateSummaryDTO(accountIds:Seq[AccountId], ccys:Seq[AssetId], conversion:String)