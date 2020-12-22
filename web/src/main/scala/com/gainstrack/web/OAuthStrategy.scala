package com.gainstrack.web

import com.auth0.jwk.SigningKeyNotFoundException
import com.auth0.jwt.JWT
import com.auth0.jwt.exceptions.{JWTDecodeException, JWTVerificationException, TokenExpiredException}
import com.auth0.jwt.interfaces.DecodedJWT
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
    validateToken(token)
  }


  private def validateToken(token: String) = {
    try {
      val decoded = JWT.decode(token)
      val issuer = decoded.getIssuer
      issuer match {
        case Auth0Config.validator.issuer => {
          validateAuth0(decoded)
        }
        case "https://securetoken.google.com/gainstrack" => {
          validateFirebaseToken(token)
        }
        case unknownIssuer => {
          halt(401, s"Unknown token issuer ${unknownIssuer}")
        }
      }
    }
    catch {
      case e: JWTDecodeException => {
        logger.warn(s"Invalid JWT: ${e.getMessage}")
        halt(401, "Invalid token")
      }
    }
  }

  private def validateFirebaseToken(token: String) = {
    // Gainstrack firebase token
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
        logger.error(e.toString);
        None
      }
    }
  }

  private def validateAuth0(decoded: DecodedJWT) = {
    // Auth0 token
    try {
      Auth0Config.validator.validate(decoded)
      Some(GUser(decoded.getSubject))
    }
    catch {
      case e: JWTVerificationException => {
        logger.warn(s"Attempt to login failed with ${e.getMessage}")
        halt(401, "Invalid auth0 token")
      }
      case e: SigningKeyNotFoundException => {
        halt(401, e.getMessage)
      }
    }
  }
}
