package com.gainstrack.web

import com.auth0.jwt.exceptions.{JWTVerificationException, TokenExpiredException}
import javax.servlet.http.{HttpServletRequest, HttpServletResponse}
import org.json4s.Formats
import org.scalatra.ScalatraBase
import org.scalatra.auth.ScentryStrategy
import org.slf4j.LoggerFactory

class Auth0Strategy (protected override val app: ScalatraBase)
                    (implicit request: HttpServletRequest, response: HttpServletResponse, jsonFormats: Formats) extends ScentryStrategy[GUser] {

  val logger = LoggerFactory.getLogger(getClass)

  // TODO: Would be good to externalise this to env files like in nodejs
  val audience = if (app.isDevelopmentMode) "http://localhost:8080" else "https://poc.gainstrack.com"
  val auth0id = if (app.isDevelopmentMode) "dev-q-172al0" else "gainstrack"

  logger.info(s"Auth0 audience ${audience} id ${auth0id} is dev ${app.isDevelopmentMode}")
  val validator = new Auth0JWTVerifier(auth0id, audience)


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
