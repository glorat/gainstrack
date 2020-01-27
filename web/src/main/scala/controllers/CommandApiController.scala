package controllers

import com.gainstrack.command.{GainstrackParser, ParserMessage}
import com.gainstrack.report.GainstrackGenerator
import com.gainstrack.web.{AuthenticationSupport, GainstrackJsonSerializers, GainstrackSupport}
import org.json4s.{Formats, JValue}
import org.scalatra.{InternalServerError, ScalatraServlet}
import org.scalatra.json.JacksonJsonSupport

import scala.concurrent.ExecutionContext

class CommandApiController(implicit val ec: ExecutionContext)
  extends ScalatraServlet
    with JacksonJsonSupport
    with AuthenticationSupport
    with GainstrackSupport {
  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all

  before() {
    contentType = formats("json")
  }

  protected override def transformRequestBody(body: JValue): JValue = body.camelizeKeys

  post ("/test") {
    val bg = getGainstrack

    val body = parsedBody.extract[CommandApiRequest]
    try {
      val parser = new GainstrackParser
      parser.parseString(body.str)
      val bg2 = parser.getCommands.map(bg.addCommand)
      CommandApiResponse("ok")
    }
    catch {
      case e:Exception => InternalServerError(e.toString)
    }

  }

  post ("/add") {
    val bg = getGainstrack

    val body = parsedBody.extract[CommandApiRequest]
    try {
      val parser = new GainstrackParser
      parser.parseString(body.str)
      val bg2 = parser.getCommands.foldLeft(bg)(_.addCommand(_))
      // updateGainstrack(bg2)

      val realFile = "real"
      val res  = bg2.writeBeancountFile(s"/tmp/${realFile}.beancount", parser.lineFor(_))
      if (res.length == 0) {
        session("gainstrack") = bg2

        CommandApiResponse("ok")
      }
      else {
        // Giant assumption that adding one command generates only one error message
        CommandApiResponse(res.head.message)
      }

    }
    catch {
      case e:Exception => InternalServerError(e.toString)
    }

  }


  put("/source") {
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
        if (isAuthenticated) {
          saveGainstrack(bg)
        }

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

}
case class CommandApiRequest(str:String)
case class CommandApiResponse(success:String)
