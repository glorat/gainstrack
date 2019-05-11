package controllers

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gainstrack.command.{AccountCreation, GainstrackParser}
import com.gainstrack.core._
import com.gainstrack.report.{AccountInvestmentReport, GainstrackGenerator, IrrSummary}
import org.json4s.{CustomSerializer, Formats}
import org.json4s.JsonAST.JString
import org.scalatra._
import org.scalatra.json.JacksonJsonSupport
import org.scalatra.scalate.ScalateSupport

import scala.concurrent.ExecutionContext
import scala.io.Source

object CommandController {
  type UrlFn = (String, Iterable[(String,Any)]) => String
}

class CommandController (implicit val ec :ExecutionContext) extends ScalatraServlet with JacksonJsonSupport with ScalateSupport {
  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats + LocalDateSerializer

  val parser = new GainstrackParser
  val realFile = "real"
  val filename = s"/Users/kevin/dev/gainstrack/data/${realFile}.gainstrack"
  parser.parseFile(filename)
  val orderedCmds = parser.getCommands
  val bg = new GainstrackGenerator(orderedCmds)

  before() {
    //contentType = formats("json")
  }

  get("/") {
    val urlFor:MainController.UrlFn = (path:String, params:Iterable[(String,Any)]) => url(path,params)(this.request, this.response)

    contentType="text/html"

    val mainAccountIds:Set[AccountId] = bg.finalCommands.map(_.mainAccounts).reduceLeft(_ ++ _)
    val mainAccounts:Seq[AccountCreation] = bg.acctState.accounts.filter(a => mainAccountIds.contains(a.accountId)).toSeq.sortBy(_.accountId)

    layoutTemplate("/WEB-INF/views/command.ssp",
      "short_title"->"UI Account Editor",
      "data"-> mainAccounts,
      "urlFor" -> urlFor
    )
    //ssp("/foo")
  }

  get("/get/:accountId") {
    val urlFor:MainController.UrlFn = (path:String, params:Iterable[(String,Any)]) => url(path,params)(this.request, this.response)

    contentType="text/html"


    val accountId = params("accountId")
    bg.acctState.accountMap.get(accountId).map(account => {
      // Actually want to use originalCommands here but then we can't filter!
      // Chicken and egg problem... do we need to trace the supply chain?
      val commands = bg.finalCommands.filter(cmd => cmd.usesAccount(accountId))

      contentType="text/html"

      layoutTemplate("/WEB-INF/views/commandAccount.ssp",
        "short_title"->"UI Account Editor",
        "account" -> account,
        "data"-> commands,
        "urlFor" -> urlFor
      )
    }).getOrElse(NotFound(s"${accountId} account not found"))
  }

  get("/editor/") {
    val urlFor:MainController.UrlFn = (path:String, params:Iterable[(String,Any)]) => url(path,params)(this.request, this.response)

    val source = Source.fromFile(filename).mkString

    contentType="text/html"

    layoutTemplate("/WEB-INF/views/editor.ssp",
      "short_title"->"UI Account Editor",
      "data"-> None,
      "source" -> source,
      "urlFor" -> urlFor
    )
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