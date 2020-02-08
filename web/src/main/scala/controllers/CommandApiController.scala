package controllers

import com.gainstrack.command.{CommodityCommand, GainstrackParser, ParserMessage}
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
      // TODO: How about see if it actually generates??
      CommandApiResponse("ok")
    }
    catch {
      case e:Exception => InternalServerError(e.toString)
    }

  }

  post ("/add") {
    val bg = getGainstrack
    val parser = new GainstrackParser
    val body = parsedBody.extract[CommandApiRequest]
    try {
      parser.parseString(body.str)
      val bg2 = parser.getCommands.foldLeft(bg)(_.addCommand(_))
      saveGainstrack(bg2)
      CommandApiResponse("ok")

    }
    catch {
      case e:Exception if parser.parserErrors.size>0 => {
        ApiSourceResponse("???", false, parser.parserErrors)
      }
      case e:Exception => ApiSourceResponse("???", false, Seq(ParserMessage(e.getMessage, 0, "")))

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
      CommandApiResponse("ok")
    }
    catch {
      case e:Exception if parser.parserErrors.size>0 => {
        ApiSourceResponse("???", false, parser.parserErrors)
      }
      case e:Exception => ApiSourceResponse("???", false, Seq(ParserMessage(e.getMessage, 0, "")))

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
      ApiSourceResponse("???", true, Seq())
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
