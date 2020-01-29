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

  val audience = "http://localhost:8080"
  val auth0id = "dev-q-172al0"
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
