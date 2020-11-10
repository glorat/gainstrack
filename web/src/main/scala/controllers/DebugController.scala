package controllers

import com.gainstrack.web.{AuthenticationSupport, TimingSupport}
import org.json4s.Formats
import org.scalatra.{ContentEncodingSupport, ScalatraServlet}
import org.scalatra.json.JacksonJsonSupport
import org.slf4j.LoggerFactory

import scala.concurrent.ExecutionContext

class DebugController(implicit val ec :ExecutionContext)
  extends ScalatraServlet with TimingSupport with JacksonJsonSupport with ContentEncodingSupport with AuthenticationSupport {
  protected implicit val jsonFormats:Formats = org.json4s.DefaultFormats
  val logger =  LoggerFactory.getLogger(getClass)

  get ("/text") {
    contentType = "text/plain"
    this.request.headers.names.map(nm => s"${nm}: ${this.request.headers.get(nm).get}").mkString("\n")
  }

  get ("/json"){
    contentType = formats("json")
    val headers = this.request.headers.names.map(nm => nm -> this.request.headers.get(nm).get).toSeq
    headers
  }

  get("/authn") {
    val user = scentry.authenticate()
    val authn = (user.map(u => s"authenticated ${u.username} - ${u.uuid}").getOrElse("unauthenticated requested"))
    val strats = s"There are ${scentry.strategies.size} authentication strategies"
    contentType = "text/plain"
    Seq(authn, strats).mkString("\n")
  }

  get("/cookies") {
    contentType = "text/plain"
    request.getCookies.map(cookie => s"${cookie.getName}: ${cookie.getValue}").mkString("\n")
  }
}
