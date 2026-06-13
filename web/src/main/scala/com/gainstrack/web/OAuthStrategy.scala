package com.gainstrack.web

import com.gainstrack.lifecycle.FirebaseFactory
import com.google.firebase.auth.FirebaseAuthException
import javax.servlet.http.{HttpServletRequest, HttpServletResponse}
import org.json4s.Formats
import org.scalatra.{Control, ScalatraBase}
import org.scalatra.auth.ScentryStrategy
import org.slf4j.LoggerFactory

class OAuthStrategy (protected override val app: ScalatraBase)
                    (implicit request: HttpServletRequest, response: HttpServletResponse, jsonFormats: Formats) extends ScentryStrategy[GUser] with Control{

  val logger = LoggerFactory.getLogger(getClass)

  override def name: String = this.getClass.getName

  override def isValid(implicit request: HttpServletRequest): Boolean = {
    val header = request.getHeader("Authorization")
    header != null && header.startsWith("Bearer")
  }

  override def authenticate()(implicit request: HttpServletRequest, response: HttpServletResponse): Option[GUser] = {
    val header = request.getHeader("Authorization")
    val token = header.drop("Bearer ".length)
    try {
      val decodedToken = FirebaseFactory.firebaseAuth.verifyIdToken(token)
      val uid = decodedToken.getUid
      logger.info(s"Validated firebase bearer token for ${uid}")
      Some(GUser(uid))
    }
    catch {
      case e: FirebaseAuthException => {
        logger.warn(s"Attempt to login with Firebase failed with ${e.getMessage}")
        halt(401, "Invalid firebase token")
      }
      case e: IllegalStateException => {
        logger.error(s"FirebaseAuth illegal setup state: ${e.getMessage}")
        None
      }
    }
  }
}
