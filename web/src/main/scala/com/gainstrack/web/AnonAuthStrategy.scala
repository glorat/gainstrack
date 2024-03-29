package com.gainstrack.web

import com.auth0.jwt.exceptions.JWTVerificationException
import com.gainstrack.lifecycle.FirebaseFactory
import com.google.firebase.auth.FirebaseAuthException
import javax.servlet.http.{HttpServletRequest, HttpServletResponse}
import org.json4s.Formats
import org.scalatra.ScalatraBase
import org.scalatra.auth.ScentryStrategy
import org.scalatra.servlet.ServletApiImplicits
import org.slf4j.LoggerFactory

class AnonAuthStrategy (protected override val app: ScalatraBase)
                       (implicit request: HttpServletRequest, response: HttpServletResponse)
  extends ScentryStrategy[GUser] with ServletApiImplicits {

  val logger = LoggerFactory.getLogger(getClass)

  override def name: String = this.getClass.getName

  override def isValid(implicit request: HttpServletRequest): Boolean = {

    val header = request.getHeader("Authorization")
    if (header != null && header.startsWith("Bearer")) {
      // If there is a token, can't be an anonymous attempt
      // This does mean a user with a broken bearer token will have a broken app
      logger.debug("Bearer token exists so cannot be anon")
      false
    } else {
      val copt = request.cookies.get(AnonAuthStrategy.ANON_KEY)
      logger.debug(s"${AnonAuthStrategy.ANON_KEY}: ${copt.getOrElse("undefined")}")
      copt.isDefined
    }
  }

  override def authenticate()(implicit request: HttpServletRequest, response: HttpServletResponse): Option[GUser] = {
    request.cookies.get(AnonAuthStrategy.ANON_KEY).map(id => {
      logger.info("Anonymous user: " + id)
      GUser.anonymous(id)
    })
  }
}

object AnonAuthStrategy {
  val ANON_KEY = "anonid"
}