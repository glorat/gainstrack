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
    this.request.headers.names.map(nm => s"${nm}: ${this.request.headers.get(nm).get}").mkString("\n")
  }

  get ("/json"){
    contentType = formats("json")
    val headers = this.request.headers.names.map(nm => nm -> this.request.headers.get(nm).get).toSeq
    headers
  }
}
