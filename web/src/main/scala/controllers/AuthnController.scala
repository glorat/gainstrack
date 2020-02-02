package controllers

import com.gainstrack.web.{AuthenticationSupport, GainstrackJsonSerializers, GainstrackSupport}
import org.json4s.Formats
import org.scalatra.ScalatraServlet
import org.scalatra.json.JacksonJsonSupport
import org.slf4j.LoggerFactory

import scala.concurrent.ExecutionContext

class AuthnController(implicit val ec: ExecutionContext)
  extends ScalatraServlet
    with JacksonJsonSupport
    with AuthenticationSupport
    with GainstrackSupport {
  val logger = LoggerFactory.getLogger(getClass)

  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all

  post("/login") {
    scentry.authenticate().map(user => {
      val msg = s"Login occurred for ${user.username} ${user.uuid}"
      logger.info(msg)
      // If we have a file, then flush session to pick up file
      if (bgFromFile.isDefined) {
        session.remove("gainstrack")
      }
      getSummary

    }).getOrElse({
      logger.warn(s"Login failed")
      val ret = getSummary
      ret.copy(authentication = ret.authentication.copy(error = "Login failed"))
    })
  }

  post("/logout") {
    scentry.logout
    getSummary
  }
}
