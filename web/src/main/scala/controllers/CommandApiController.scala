package controllers

import com.gainstrack.command.GainstrackParser
import com.gainstrack.report.GainstrackGenerator
import org.json4s.{Formats, JValue}
import org.scalatra.{InternalServerError, ScalatraServlet}
import org.scalatra.json.JacksonJsonSupport

import scala.concurrent.ExecutionContext

class CommandApiController(implicit val ec :ExecutionContext) extends ScalatraServlet with JacksonJsonSupport {
  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all

  val bgDefault = {
    val parser = new GainstrackParser
    val realFile = "real"
    parser.parseFile(s"/Users/kevin/dev/gainstrack/data/${realFile}.gainstrack")
    val orderedCmds = parser.getCommands
    new GainstrackGenerator(orderedCmds)
  }

  before() {
    contentType = formats("json")
  }

  protected override def transformRequestBody(body: JValue): JValue = body.camelizeKeys

  post ("/test") {
    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]

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
    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]

    val body = parsedBody.extract[CommandApiRequest]
    try {
      val parser = new GainstrackParser
      parser.parseString(body.str)
      val bg2 = parser.getCommands.foldLeft(bg)(_.addCommand(_))
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

}
case class CommandApiRequest(str:String)
case class CommandApiResponse(success:String)
