package com.gainstrack.web

import org.scalatra.ScalatraBase
import org.scalatra.auth.{ScentryConfig, ScentrySupport}
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
  }

}