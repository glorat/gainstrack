package com.gainstrack.web

import javax.servlet.http.{HttpServletRequest, HttpServletResponse}
import org.scalatra.ScalatraBase
import org.scalatra.auth.ScentryAuthStore.ScentryAuthStore
import org.scalatra.auth.{Scentry, ScentryConfig, ScentrySupport}
import org.scalatra.json.JacksonJsonSupport
import org.slf4j.LoggerFactory

trait AuthenticationSupport extends ScentrySupport[GUser] {
  self: ScalatraBase with JacksonJsonSupport =>
  private val logger =  LoggerFactory.getLogger(getClass)
  protected def fromSession = { case id: String => GUser(id)  }
  protected def toSession   = { case usr: GUser => usr.id }

  protected val scentryConfig = (new ScentryConfig {}).asInstanceOf[ScentryConfiguration]

/**
 * If an unauthenticated user attempts to access a route which is protected by Scentry
 * */
  override protected def configureScentry = {
    // This is commented out because it is pointless
//    scentry.unauthenticated {
//      scentry.strategies("SimpleAuthStrategy").unauthenticated()
//    }
  }

  /**
   * Register auth strategies with Scentry. Any controller with this trait mixed in will attempt to
   * progressively use all registered strategies to log the user in, falling back if necessary.
   */
  override protected def registerAuthStrategies = {
    scentry.register("SimpleAuthStrategy", app => new SimpleAuthStrategy(app))
    scentry.register("Auth0Strategy", app => new Auth0Strategy(app))
    scentry.register("FirebaseStrategy", app => new FirebaseStrategy(app))

    scentry.store = new ScentryAuthStore {
      val myKey = Scentry.scentryAuthKey + ".token"
      override def get(implicit request: HttpServletRequest, response: HttpServletResponse): String = {
        request.get(myKey).map(_.asInstanceOf[String]).orNull
      }

      override def set(value: String)(implicit request: HttpServletRequest, response: HttpServletResponse): Unit = {
        request.setAttribute(myKey, value)
      }

      override def invalidate()(implicit request: HttpServletRequest, response: HttpServletResponse): Unit = {

      }
    }
  }

}
