package com.gainstrack.web

import com.auth0.jwt.exceptions.JWTVerificationException
import com.gainstrack.lifecycle.FirebaseFactory
import com.google.firebase.auth.FirebaseAuthException
import javax.servlet.http.{HttpServletRequest, HttpServletResponse}
import org.json4s.Formats
import org.scalatra.ScalatraBase
import org.scalatra.auth.ScentryStrategy
import org.slf4j.LoggerFactory

class FirebaseStrategy (protected override val app: ScalatraBase)
                       (implicit request: HttpServletRequest, response: HttpServletResponse, jsonFormats: Formats) extends ScentryStrategy[GUser] {

  val logger = LoggerFactory.getLogger(getClass)

  override def authenticate()(implicit request: HttpServletRequest, response: HttpServletResponse): Option[GUser] = {

    val header = request.getHeader("Authorization")
    if (header != null && header.startsWith("Bearer")) {
      val token = header.drop("Bearer ".length)
      // FIXME: The next line is a security hole... showing a token that is usable for up to 24hrs
      // Admins that can see the logs will be able to impersonate
      // Restrict this to dev only once we are done testing
      logger.info(s"Handle bearer token ${token}")
      try {
        import com.google.firebase.auth.FirebaseAuth
        import com.google.firebase.auth.FirebaseToken
        val decodedToken = FirebaseAuth.getInstance.verifyIdToken(token)
        val uid = decodedToken.getUid

        logger.info(s"Validated firebase bearer token for ${uid}")
        Some(GUser(uid))
      }
      catch {
        case e: FirebaseAuthException => {
          logger.error(s"Attempt to login with Firebase failed with ${e.getMessage}")
          None
        }
      }

    }
    else {
      None
    }
  }
}