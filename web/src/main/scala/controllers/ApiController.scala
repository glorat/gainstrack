package controllers

import com.gainstrack.command.GainstrackParser
import com.gainstrack.core.parseDate
import com.gainstrack.report.GainstrackGenerator
import org.json4s.{DefaultFormats, Formats, JValue}
import org.scalatra.ScalatraServlet
import org.scalatra.json._

import scala.concurrent.ExecutionContext



class ApiController (implicit val ec :ExecutionContext) extends ScalatraServlet with JacksonJsonSupport {
  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats + LocalDateSerializer

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


}

case class ApiSourceRequest(filePath:String, entryHash:String, source:String, sha256sum: String)
case class ApiSourceResponse(sha256sum:String, success:String)