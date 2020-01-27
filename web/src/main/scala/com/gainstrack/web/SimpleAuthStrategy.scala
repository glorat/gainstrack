package com.gainstrack.web

import javax.servlet.http.{HttpServletRequest, HttpServletResponse}
import org.json4s.Formats
import org.scalatra.ScalatraBase
import org.scalatra.auth.ScentryStrategy
import org.scalatra.json.JacksonJsonSupport
import org.slf4j.LoggerFactory

class SimpleAuthStrategy(protected override val app: ScalatraBase)
                        (implicit request: HttpServletRequest, response: HttpServletResponse, jsonFormats: Formats) extends ScentryStrategy[GUser] {
  val logger = LoggerFactory.getLogger(getClass)

  override def name: String = "SimpleAuthStrategy"

  private val jsonOpt:Option[JacksonJsonSupport] = if (app.isInstanceOf[JacksonJsonSupport] ) Some(app.asInstanceOf[JacksonJsonSupport]) else None
  private val bodyOpt = jsonOpt.map(_.parsedBody)
  private val username = bodyOpt.flatMap(body => (body \ "username").extractOpt[String]).map(_.toLowerCase)
  private val password = bodyOpt.flatMap(body => (body \ "password").extractOpt[String])

  /***
   * Determine whether the strategy should be run for the current request.
   */
  override def isValid(implicit request: HttpServletRequest) = {
    val valid = username.isDefined && password.isDefined
    logger.debug("UserPasswordStrategy: determining isValid: " + valid.toString())
    valid
  }


  def authenticate()(implicit request: HttpServletRequest, response: HttpServletResponse): Option[GUser] = {
    try {
      logger.info("Attempting authentication")

      val hash = Pbkdf2.encode(password.get, username.get)
      Some(GUser(username.get, hash))
    }
    catch {
      case e:IllegalArgumentException => None
      case e:NoSuchElementException => None // A lazy shortcut
    }
  }

  override def unauthenticated()(implicit request: HttpServletRequest, response: HttpServletResponse): Unit = {
    // Do nothing
  }
}

case class GUser(username: String, hash:String) {
  def id = s"$username-$hash"

  require(username.matches("^[a-z]+$"))
  require(hash.matches("^[0-9a-f]+$"))
  // TODO: require hash is a hex string
}

object GUser {
  def apply(str:String):GUser = {
    val bits = str.split(raw"\-")
    GUser(bits(0), bits(1))
  }
}