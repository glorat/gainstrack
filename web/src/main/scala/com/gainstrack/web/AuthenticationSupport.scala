package com.gainstrack.web

import javax.servlet.http.{HttpServletRequest, HttpServletResponse}
import org.scalatra.ScalatraBase
import org.scalatra.json.JacksonJsonSupport
import org.slf4j.LoggerFactory

trait AuthenticationSupport  {
  self: ScalatraBase with JacksonJsonSupport =>
  private val logger =  LoggerFactory.getLogger(getClass)

  private val authKey = "com.gainstrack.authuser"

  // These methods can be found on AuthenticationSupport but we maintain a narrow
  // dependency here in case, for example, it needs mocking out
  protected def isAuthenticated(implicit request: HttpServletRequest): Boolean = {
    request.get(authKey).isDefined
  }
  protected def user(implicit request: HttpServletRequest): GUser = {
    request(authKey).asInstanceOf[GUser]
  }

  def user_=(v: GUser)(implicit request: HttpServletRequest, response: HttpServletResponse) = {
    request(authKey) = v
  }

  protected def authenticate():Option[GUser] = {
    val opt = parseUser()
    opt.map(user => {
      this.user = user
      user
    })
  }

  private def parseUser():Option[GUser] = {
    val header = request.getHeader("Authorization")
    val anon = new AnonAuthStrategy(this)
    val simple = new SimpleAuthStrategy(this) // Deprecated
    val oauth2 = new OAuthStrategy(this)

    if (request.contains(authKey)) {
      Some(this.user)
    }
    else if (oauth2.isValid) {
      oauth2.authenticate()
    } else if (simple.isValid) {
      simple.authenticate()
    } else if (anon.isValid) {
      // Anonymous
      anon.authenticate()
    } else {
      None
    }
  }

}
