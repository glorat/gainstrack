package controllers

import com.gainstrack.web.TimingSupport
import org.json4s.Formats
import org.scalatra.{ContentEncodingSupport, ScalatraServlet}
import org.scalatra.json.JacksonJsonSupport

import scala.concurrent.ExecutionContext

class DebugController(implicit val ec :ExecutionContext)
  extends ScalatraServlet with TimingSupport with JacksonJsonSupport with ContentEncodingSupport {
  protected implicit val jsonFormats:Formats = org.json4s.DefaultFormats

  get ("/text") {
    contentType = "text/plain"
    this.request.headers.toSeq.map(x => s"${x._1}: ${x._2}").mkString("\n")
  }

  get ("/json"){
    contentType = formats("json")
    val headers = this.request.headers.toSeq.map(x => Map(x._1 -> x._2))
    headers
  }
}
