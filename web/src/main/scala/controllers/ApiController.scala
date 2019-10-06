package controllers

import java.time.LocalDate

import com.gainstrack.command.{AccountCreation, GainstrackParser}
import com.gainstrack.core.{AccountCommand, AccountId, PositionSet, parseDate}
import com.gainstrack.report.{AccountInvestmentReport, BalanceReport, GainstrackGenerator, IrrSummary, TimeSeries}
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
    val body = parsedBody.extract[ApiSourceRequest]


    val parser = new GainstrackParser
    val realFile = "real"
    parser.parseString(body.source)
    val orderedCmds = parser.getCommands
    val bg = new GainstrackGenerator(orderedCmds)
    bg.writeBeancountFile(s"/tmp/${realFile}.beancount")
    session("gainstrack") = bg

    //val defaultFromDate = parseDate("1970-01-01")


    ApiSourceResponse("???", "true")
  }

  get("/test/") {
    ApiSourceResponse("???", "true")
  }

  def tables(keys:Seq[String]) = {
    val bg = sessionOption.map(_("gainstrack")).getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]

    val balanceReport = BalanceReport(bg.txState.cmds)
    var toDate = LocalDate.now

    val state = balanceReport.getState
    val acctState = bg.acctState.withInterpolatedAccounts
    val priceState = bg.priceState

    val treeTable = new BalanceTreeTable(bg.acctState, priceState, toDate, balanceReport)

    keys.map(key => key -> treeTable.toTreeTable(AccountId(key))).toMap
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
    val bg = sessionOption.map(_("gainstrack")).getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    val priceState = bg.priceState

    priceState.toDTO

  }

  get("/irr/") {
    val bg = sessionOption.map(_("gainstrack")).getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]

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
    val bg = sessionOption.map(_("gainstrack")).getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    val accountId = params("accountId")
    val fromDate = defaultFromDate
    bg.acctState.accountMap.get(accountId).map(account => {
      val accountReport = new AccountInvestmentReport(accountId, account.key.assetId, fromDate,  LocalDate.now(), bg.acctState, bg.balanceState, bg.txState, bg.priceState)
      val cfs = accountReport.cashflowTable.sorted
      TimeSeries(accountId, cfs.map(_.value.ccy.symbol), cfs.map(_.date.toString), cfs.map(_.value.value.toDouble.toString), cfs.map(_.source.toString))
    }).getOrElse(NotFound(s"${accountId} account not found"))
  }

  get("/editor/") {
    val bg = sessionOption.map(_("gainstrack")).getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    val source = bg.toGainstrack
    Map("source" -> source, "short_title" -> "Editor")
  }

  get("/account/:accountId") {

    val bg = sessionOption.map(_("gainstrack")).getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]


    val accountId : AccountId = params("accountId")


    //bg.acctState.accountMap.get(accountId).map(account => {
    val txs = bg.txState.txsUnderAccount(accountId)

    // In reverse chrono order
    val commands = txs.map(_.origin).toSet.toSeq.sorted.reverse

    val balanceFor : AccountCommand => PositionSet = {cmd =>

      val mytxs = txs.takeWhile(_.origin != cmd) ++ txs.filter(_.origin == cmd)
      /*
       For units report...

              val mypostings = mytxs.flatMap(_.filledPostings).filter(_.account.isSubAccountOf(accountId))
              val balance = mypostings.foldLeft(PositionSet())(_ + _.value.get)
              balance*/
      val balanceReport = BalanceReport(mytxs)
      balanceReport.getState.convertedPosition(accountId, bg.acctState, bg.priceState, cmd.date)
    }

    val deltaFor : AccountCommand => PositionSet = {cmd =>
      val mytxs = txs.filter(_.origin == cmd)
      val balanceReport = BalanceReport(mytxs)
      balanceReport.getState.convertedPosition(accountId, bg.acctState, bg.priceState, cmd.date)
    }

    val rows = commands.map(cmd => {
      AccountTxDTO(cmd.date.toString, cmd.getClass.getSimpleName, cmd.description, deltaFor(cmd).toString, balanceFor(cmd).toString)
    })
    AccountTxSummaryDTO(accountId.toString, rows)
  }

  get ("/command/") {
    val bg = sessionOption.map(_("gainstrack")).getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]

    val mainAccountIds:Set[AccountId] = bg.finalCommands.flatMap(_.mainAccount).toSet
    val mainAccounts:Seq[AccountCreation] = bg.acctState.accounts.filter(a => mainAccountIds.contains(a.accountId)).toSeq.sortBy(_.accountId)

    mainAccounts
  }

  get ("/command/:accountId") {

    val bg = sessionOption.map(_("gainstrack")).getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]

    val accountId = params("accountId")
    bg.acctState.accountMap.get(accountId).map(account => {

      val commands = bg.originalCommands.filter(cmd => cmd.hasMainAccount(Some(accountId)))

      Map("account" -> account, "commands" -> commands)
    }).getOrElse(NotFound(s"${accountId} account not found"))
  }
}
//case class BalanceSheet(balanceSheet: Map[String,TreeTable])
case class ApiSourceRequest(filePath:String, entryHash:String, source:String, sha256sum: String)
case class ApiSourceResponse(sha256sum:String, success:String)

case class AccountTxSummaryDTO(accountId:String, rows:Seq[AccountTxDTO])
case class AccountTxDTO(date:String, cmdType:String, description:String, change: String, position:String)
