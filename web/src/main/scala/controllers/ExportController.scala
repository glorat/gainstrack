package controllers

import com.gainstrack.command.GainstrackParser
import com.gainstrack.core.GainstrackJsonSerializers
import com.gainstrack.report.GainstrackGenerator
import com.gainstrack.web.{AuthenticationSupport, GainstrackSupport}
import org.json4s.Formats
import org.scalatra.ScalatraServlet
import org.scalatra.json.JacksonJsonSupport

import scala.concurrent.ExecutionContext

class ExportController(implicit val ec: ExecutionContext)
  extends ScalatraServlet
    with AuthenticationSupport
    with JacksonJsonSupport
    with GainstrackSupport {

  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all

  get("/gainstrack") {
    val bg = getGainstrack
    val source = bg.toGainstrack

    contentType = "application/text"
    response.setHeader("Content-Disposition", f"""attachment; filename="mydata.gainstrack"""") // <-- use this if you want to trigger a download prompt in most browsers
    source
  }

  get("/beancount") {
    val bg = getGainstrack
    val source = bg.toBeancount.map(_.value).mkString("\n")

    contentType = "application/text"
    response.setHeader("Content-Disposition", f"""attachment; filename="mydata.beancount"""") // <-- use this if you want to trigger a download prompt in most browsers
    source
  }
}
