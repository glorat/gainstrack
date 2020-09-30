package controllers

import com.gainstrack.command.{CommodityCommand, GainstrackParser, ParserMessage}
import com.gainstrack.core._
import com.gainstrack.report.{BalanceReport, GainstrackGenerator, SingleFXConverter}
import com.gainstrack.web.{AuthenticationSupport, GainstrackJsonSerializers, GainstrackSupport, TimingSupport}
import org.json4s.{Formats, JValue}
import org.scalatra.{InternalServerError, ScalatraServlet}
import org.scalatra.json.JacksonJsonSupport
import org.slf4j.LoggerFactory

import scala.concurrent.ExecutionContext

class CommandApiController(implicit val ec: ExecutionContext)
  extends ScalatraServlet
    with JacksonJsonSupport
    with AuthenticationSupport
    with GainstrackSupport
    with TimingSupport {
  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all
  val logger =  LoggerFactory.getLogger(getClass)

  before() {
    scentry.authenticate()
    contentType = formats("json")
  }

  protected override def transformRequestBody(body: JValue): JValue = body.camelizeKeys



  def gainstrackChange(cmds: Seq[AccountCommand], bg: GainstrackGenerator, bg2: GainstrackGenerator, singleFXConverter: SingleFXConverter, date:LocalDate) = {
    val baseCcy = bg.acctState.baseCurrency
    val added = bg2.txState.cmds.diff(bg.txState.cmds).collect{case tx: Transaction=> tx}
    val removed = bg.txState.cmds.diff(bg2.txState.cmds).collect{case tx: Transaction=> tx}
    val NetworthPnl:PartialFunction[AccountType, Double] = {case Assets|Liabilities => 1.0}
    val addedNetworth = added.map(_.pnl2(singleFXConverter, date, baseCcy, NetworthPnl))
    val removedNetworth = removed.map(_.pnl2(singleFXConverter, date, bg.acctState.baseCurrency, NetworthPnl))
    val changedNetworth = addedNetworth.sum - removedNetworth.sum
    val addedBalanceReport = BalanceReport(added)

    val changes = addedBalanceReport.getState.balances.keys.toSeq.sortBy(_.n).map(acctId => {
      val valueChange = addedBalanceReport.getState.balances(acctId).convertTo(baseCcy, bg2.priceFXConverter, date).getBalance(baseCcy).number.toDouble
      val unitChange = addedBalanceReport.getState.balances(acctId).toDTO
      AccountDeltaDTO(acctId.n, unitChange, valueChange)
    })

    val rows = added.map(tx => {
      val cmd = tx.origin
      val postings = tx.postings
      AccountTxDTO(cmd.date.toString, cmd.commandString, cmd.description, "0.00", "", postings)
    })

    ApiSourceResponse(errors=Seq(), added = cmds.map(cmd => cmd.toDTO), addedJournal = rows, accountChanges = changes, networthChange = changedNetworth )


  }


  post ("/test") {
    val bg = getGainstrack
    val parser = new GainstrackParser
    val body = parsedBody.extract[CommandApiRequest]
    try {

      parser.parseString(body.str)
      val cmds = parser.getCommands
      val bg2 = cmds.foldLeft(bg)(_.addCommand(_))

      // FIXME: Get live!
      val singleFXConverter = bg2.tradeFXConversion
      val date = today()
      val res = gainstrackChange(cmds, bg, bg2, singleFXConverter, date )
      res
    }
    catch {
      case e:Exception if parser.parserErrors.size>0 => {
        ApiSourceResponse(parser.parserErrors, Seq())
      }
      case e:Exception => ApiSourceResponse(Seq(ParserMessage(e.getMessage, 0, "")), Seq())

    }

  }

  post ("/add") {
    val bg = getGainstrack
    val parser = new GainstrackParser
    val body = parsedBody.extract[CommandApiRequest]
    try {
      parser.parseString(body.str)
      val cmds = parser.getCommands
      val bg2 = cmds.foldLeft(bg)(_.addCommand(_))

      // FIXME: Get live!
      val singleFXConverter = bg2.tradeFXConversion
      val date = today()
      val res = gainstrackChange(cmds, bg, bg2, singleFXConverter, date )

      saveGainstrack(bg2)
      res

    }
    catch {
      case e:Exception if parser.parserErrors.size>0 => {
        ApiSourceResponse(parser.parserErrors, Seq())
      }
      case e:Exception => ApiSourceResponse(Seq(ParserMessage(e.getMessage, 0, "")), Seq())

    }

  }

  post("/asset") {
    val bg = getGainstrack
    val parser = new GainstrackParser
    val body = parsedBody.extract[CommandApiRequest]
    try {
      parser.parseString(body.str)
      val cmds = parser.getCommands.collect {case c:CommodityCommand => c}
      val bg2 = cmds.foldLeft(bg)(_.addAssetCommand(_))
      saveGainstrack(bg2)
      CommandApiResponse("ok", cmds.map(_.toPartialDTO))
    }
    catch {
      case e:Exception if parser.parserErrors.size>0 => {
        ApiSourceResponse( parser.parserErrors, Seq())
      }
      case e:Exception => {
        logger.error(e.toString)
        ApiSourceResponse(Seq(ParserMessage(e.getMessage, 0, "")), Seq())
      }

    }

  }

  post("/source") {
    val parser = new GainstrackParser
    try {
      val body = parsedBody.extract[ApiSourceRequest]

      val realFile = "real"
      parser.parseString(body.source)
      val orderedCmds = parser.getCommands
      val bg = new GainstrackGenerator(orderedCmds)
      saveGainstrack(bg, Some(parser))
      // TODO: Find out what was added and return it
      ApiSourceResponse(Seq(), added = Seq())
    }
    catch {
      case e:Exception if parser.parserErrors.size>0 => {
        ApiSourceResponse(parser.parserErrors, Seq())
      }
      case e:Exception => {
        logger.error(e.toString)
        ApiSourceResponse(Seq(ParserMessage(e.getMessage, 0, "")), Seq())
      }
    }

  }

}
case class CommandApiRequest(str:String)
case class CommandApiResponse(success:String, added: Seq[AccountCommandDTO])

case class AccountDeltaDTO(accountId: String, unitChange: PositionSet.DTO, valueChange: Double)