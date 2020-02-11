package controllers

import com.gainstrack.command.{CommodityCommand, GainstrackParser, ParserMessage}
import com.gainstrack.core.AccountCommandDTO
import com.gainstrack.report.GainstrackGenerator
import com.gainstrack.web.{AuthenticationSupport, GainstrackJsonSerializers, GainstrackSupport, TimingSupport}
import org.json4s.{Formats, JValue}
import org.scalatra.{InternalServerError, ScalatraServlet}
import org.scalatra.json.JacksonJsonSupport

import scala.concurrent.ExecutionContext

class CommandApiController(implicit val ec: ExecutionContext)
  extends ScalatraServlet
    with JacksonJsonSupport
    with AuthenticationSupport
    with GainstrackSupport
    with TimingSupport {
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
      val cmds = parser.getCommands
      val bg2 = cmds.map(bg.addCommand)
      // TODO: How about see if it actually generates??
      CommandApiResponse("ok", cmds.map(_.toPartialDTO))
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
      val cmds = parser.getCommands
      val bg2 = cmds.foldLeft(bg)(_.addCommand(_))
      saveGainstrack(bg2)
      ApiSourceResponse(Seq(), cmds.map(cmd => cmd.toDTO))

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
      case e:Exception => ApiSourceResponse(Seq(ParserMessage(e.getMessage, 0, "")), Seq())

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
      case e:Exception => ApiSourceResponse(Seq(ParserMessage(e.getMessage, 0, "")), Seq())
    }

  }

}
case class CommandApiRequest(str:String)
case class CommandApiResponse(success:String, added: Seq[AccountCommandDTO])
