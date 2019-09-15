package controllers

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gainstrack.command.{AccountCreation, GainstrackParser}
import com.gainstrack.core._
import com.gainstrack.report.{AccountInvestmentReport, GainstrackGenerator, IrrSummary}
import javax.servlet.http.{HttpServletRequest, HttpServletResponse}
import org.json4s.{CustomSerializer, Formats}
import org.json4s.JsonAST.JString
import org.scalatra._
import org.scalatra.json.JacksonJsonSupport
import org.scalatra.scalate.ScalateSupport

import scala.concurrent.ExecutionContext
import scala.io.Source

object CommandController {
  type UrlFn = (String, Iterable[(String,Any)]) => String
  type BalanceFor = LocalDate => Option[Fraction]
}

class CommandController (implicit val ec :ExecutionContext) extends ScalatraServlet with JacksonJsonSupport with ScalateSupport {
  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats + LocalDateSerializer

  val parser = new GainstrackParser
  val realFile = "real"
  val filename = s"/Users/kevin/dev/gainstrack/data/${realFile}.gainstrack"
  parser.parseFile(filename)
  val orderedCmds = parser.getCommands
  val bgDefault = new GainstrackGenerator(orderedCmds)

  val urlFor:MainController.UrlFn =
    (path:String, params:Iterable[(String,Any)])
    => url(path,params, false)(this.request, this.response)


  before() {
    //contentType = formats("json")
  }

  get("/") {
    contentType="text/html"

    val bg = sessionOption.map(_("gainstrack")).getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]

    val mainAccountIds:Set[AccountId] = bg.finalCommands.flatMap(_.mainAccount).toSet
    val mainAccounts:Seq[AccountCreation] = bg.acctState.accounts.filter(a => mainAccountIds.contains(a.accountId)).toSeq.sortBy(_.accountId)

    layoutTemplate("/WEB-INF/views/command.ssp",
      "short_title"->"UI Account Editor",
      "data"-> mainAccounts,
      "urlFor" -> urlFor
    )
    //ssp("/foo")
  }

  get("/get/:accountId") {
    contentType="text/html"

    val bg = sessionOption.map(_("gainstrack")).getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]


    val accountId = params("accountId")
    bg.acctState.accountMap.get(accountId).map(account => {

      val commands = bg.originalCommands.filter(cmd => cmd.hasMainAccount(Some(accountId)))

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
    val bg = sessionOption.map(_("gainstrack")).getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]

    val source = bg.toGainstrack
    //val source = Source.fromFile(filename).mkString

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