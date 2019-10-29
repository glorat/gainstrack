package controllers

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gainstrack.command.{AccountCreation, GainstrackParser}
import com.gainstrack.core._
import com.gainstrack.report.{AccountInvestmentReport, BalanceReport, GainstrackGenerator, IrrSummary}
import org.json4s.{CustomSerializer, Formats}
import org.json4s.JsonAST.JString
import org.scalatra._
import org.scalatra.json.JacksonJsonSupport
import org.scalatra.scalate.ScalateSupport

import scala.concurrent.ExecutionContext

case class Hello(world:String)

object MainController {
  type UrlFn = (String, Iterable[(String,Any)]) => String
}

class  MainController (implicit val ec :ExecutionContext) extends ScalatraServlet with JacksonJsonSupport with ScalateSupport {
  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats + LocalDateSerializer

  val bgDefault = {
    val parser = new GainstrackParser
    val realFile = "real"
    parser.parseFile(s"/Users/kevin/dev/gainstrack/data/${realFile}.gainstrack")
    val orderedCmds = parser.getCommands
    new GainstrackGenerator(orderedCmds)
  }


  val defaultFromDate = parseDate("1970-01-01")

  val urlFor:MainController.UrlFn =
    (path:String, params:Iterable[(String,Any)])
    => url(path,params)(this.request, this.response)


  before() {
    //contentType = formats("json")
  }

  get("/gainstrack/irr/:accountId") {
    val bg = sessionOption.map(_("gainstrack")).getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    val accountId = params("accountId")
    val fromDate = defaultFromDate
    bg.acctState.accountMap.get(accountId).map(account => {
      val accountReport = new AccountInvestmentReport(accountId, account.key.assetId, fromDate,  LocalDate.now(), bg.acctState, bg.balanceState, bg.txState, bg.priceState)
      contentType="text/html"

      layoutTemplate("/WEB-INF/views/irrDetail.ssp",
        "short_title"->"IRR Detail",
        "detail"->accountReport,
        "urlFor" -> urlFor
      )
    }).getOrElse(NotFound(s"${accountId} account not found"))
  }

  get("/gainstrack/irr/") {
    val bg = sessionOption.map(_("gainstrack")).getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]

    var fromDate = defaultFromDate
    var toDate = LocalDate.now

    if (params.contains("time") && params("time").matches(raw"\d{4}")) {
      fromDate =  LocalDate.of(Integer.parseInt(params("time")),1,1)
      toDate = fromDate.plusYears(1)
    }

    val irr = IrrSummary(bg.finalCommands, fromDate, toDate, bg.acctState, bg.balanceState, bg.txState, bg.priceState)

    contentType="text/html"

    layoutTemplate("/WEB-INF/views/irr.ssp",
      "short_title"->"IRR Summary",
      "summary"->irr,
      "urlFor" -> urlFor
    )
    //ssp("/foo")
  }

  get ("/gainstrack/gt_prices/") {
   val bg = sessionOption.map(_("gainstrack")).getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]

    val balanceReport = BalanceReport(bg.txState.cmds)
    var toDate = LocalDate.now

    val state = balanceReport.getState
    val priceState = bg.priceState

    layoutTemplate("/WEB-INF/views/prices.ssp",
      "short_title"->"Prices",
      "priceState" -> priceState,
      "urlFor" -> urlFor
    )
  }
}
