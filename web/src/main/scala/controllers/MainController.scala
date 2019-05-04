package controllers

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gainstrack.command.GainstrackParser
import com.gainstrack.report.{AccountInvestmentReport, GainstrackGenerator, IrrSummary}
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

class MainController (implicit val ec :ExecutionContext) extends ScalatraServlet with JacksonJsonSupport with ScalateSupport {
  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats + LocalDateSerializer

  val parser = new GainstrackParser
  val realFile = "real"
  parser.parseFile(s"/Users/kevin/dev/gainstrack/data/${realFile}.gainstrack")
  val orderedCmds = parser.getCommands
  val bg = new GainstrackGenerator(orderedCmds)

  before() {
    contentType = formats("json")
  }

  get("/gainstrack/irr/:accountId") {
    val urlFor:MainController.UrlFn = (path:String, params:Iterable[(String,Any)]) => url(path,params)(this.request, this.response)

    val accountId = params("accountId")
    bg.acctState.accountMap.get(accountId).map(account => {
      val accountReport = new AccountInvestmentReport(accountId, account.key.assetId, LocalDate.now(), bg.acctState, bg.balanceState, bg.txState, bg.priceState)
      contentType="text/html"

      layoutTemplate("/WEB-INF/views/irrDetail.ssp",
        "short_title"->"IRR Detail",
        "detail"->accountReport,
        "urlFor" -> urlFor
      )
    }).getOrElse(NotFound(s"${accountId} account not found"))
  }

  get("/gainstrack/irr/") {
    val irr = IrrSummary(bg.cmds, LocalDate.now(), bg.acctState, bg.balanceState, bg.txState, bg.priceState)

    val urlFor:MainController.UrlFn = (path:String, params:Iterable[(String,Any)]) => url(path,params)(this.request, this.response)

    contentType="text/html"

    layoutTemplate("/WEB-INF/views/irr.ssp",
      "short_title"->"IRR Summary",
      "summary"->irr,
      "urlFor" -> urlFor
    )
    //ssp("/foo")
  }

  get("/") {
    import scala.io.Source

    val parser = new GainstrackParser
    Source.fromFile("/tmp/real.gainstrack").getLines.foreach(parser.parseLine)

    val cmds = parser.getCommands

    val orderedCmds = cmds.sorted

    orderedCmds.groupBy(cmd => cmd.getClass.getSimpleName)
  }
}

object LocalDateSerializer extends CustomSerializer[LocalDate](format => ({
  case JString(str) => LocalDate.parse(str)
}, {
  case value: LocalDate  => {
    val formatter = DateTimeFormatter.ofPattern("YYYY-MM-dd")
    JString(formatter.format(value))
  }
}
))