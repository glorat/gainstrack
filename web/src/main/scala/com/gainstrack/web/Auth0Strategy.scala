package com.gainstrack.web

import com.auth0.jwt.exceptions.{JWTVerificationException, TokenExpiredException}
import javax.servlet.http.{HttpServletRequest, HttpServletResponse}
import org.json4s.Formats
import org.scalatra.ScalatraBase
import org.scalatra.auth.ScentryStrategy
import org.slf4j.LoggerFactory

case class Auth0Config(domain: String, audience: String, client_id: String)

object Auth0Config {
  val logger = LoggerFactory.getLogger(getClass)

  val cfg = Auth0Config()

  logger.info(s"Auth0 validation for audience ${cfg.audience} domain ${cfg.domain}")

  val validator = new Auth0JWTVerifier(cfg)


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

  override def name: String = this.getClass.getName

  override def authenticate()(implicit request: HttpServletRequest, response: HttpServletResponse): Option[GUser] = {

    val header = request.getHeader("Authorization")
    if (header != null && header.startsWith("Bearer")) {
      val token = header.drop("Bearer ".length)
      // FIXME: The next line is a security hole... showing a token that is usable for up to 24hrs
      // Admins that can see the logs will be able to impersonate
      // Restrict this to dev only once we are done testing
      logger.info(s"Handle bearer token ${token}")
      try {
        val jwt = Auth0Config.validator.validate(token)
        logger.info(s"Validated bearer token for ${jwt.getSubject}")
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
