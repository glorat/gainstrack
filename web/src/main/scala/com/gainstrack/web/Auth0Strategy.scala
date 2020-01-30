package com.gainstrack.web

import com.auth0.jwt.exceptions.{JWTVerificationException, TokenExpiredException}
import javax.servlet.http.{HttpServletRequest, HttpServletResponse}
import org.json4s.Formats
import org.scalatra.ScalatraBase
import org.scalatra.auth.ScentryStrategy
import org.slf4j.LoggerFactory

case class Auth0Config(domain: String, audience: String, client_id: String)

object Auth0Config {
  def apply(): Auth0Config = {
    val domain = sys.env.get("AUTH0_DOMAIN").getOrElse("dev-q-172al0.auth0.com")
    val audience = sys.env.get("AUTH0_AUDIENCE").getOrElse("http://localhost:8080")
    val client_id = sys.env.get("AUTH0_CLIENT").getOrElse("UuT7elqE26W3gsAXmcuDjeVisyoGcBoV")
    Auth0Config(domain, audience, client_id)
  }

}
class Auth0Strategy (protected override val app: ScalatraBase)
                    (implicit request: HttpServletRequest, response: HttpServletResponse, jsonFormats: Formats) extends ScentryStrategy[GUser] {

  val logger = LoggerFactory.getLogger(getClass)

  // TODO: Would be good to externalise this to env files like in nodejs
  val cfg = Auth0Config()

  logger.info(s"Auth0 audience ${cfg.audience} domaind ${cfg.domain} is dev ${app.isDevelopmentMode}")
  val validator = new Auth0JWTVerifier(cfg)


  override def authenticate()(implicit request: HttpServletRequest, response: HttpServletResponse): Option[GUser] = {

    val header = request.getHeader("Authorization")
    if (header != null && header.startsWith("Bearer")) {
      val token = header.drop("Bearer ".length)
      logger.error(s"TODO: Handle bearer token ${token}")
      try {
        val jwt = validator.validate(token)
        Some(GUser(jwt.getSubject))
      }
      catch {
        case e: JWTVerificationException => {
          logger.error(s"Attempt to login failed with ${e.getMessage}")
          None
        }
      }

    }
    else {
      None
    }
  }
}
