import org.scalatra._
import javax.servlet.ServletContext
import org.slf4j.LoggerFactory

import scala.concurrent.ExecutionContext

class ScalatraBootstrap extends LifeCycle {
  val logger =  LoggerFactory.getLogger(getClass)

  override def init(context: ServletContext): Unit = {
    implicit val ec :ExecutionContext = ExecutionContext.global
    context.mount(new controllers.ApiController(), "/gainstrack/api/*")
    context.mount(new controllers.CommandApiController(), "/api/post/*")
    context.mount(new controllers.ApiController(), "/api/*")
    context.mount(new controllers.ExportController(), "/api/export/*")
    context.mount(new controllers.AuthnController(), "/api/authn/*")
    context.mount(new controllers.QuotesController(), "/api/quotes/*")
    context.mount(new controllers.DebugController(), "/api/debug/*")

    if (System.getenv("QUOTES_ADMIN") != null) {
      context.mount(new controllers.QuotesAdminController(), "/api/quotesAdmin/*")
    }

    val env = System.getenv(EnvironmentKey)
    if(env != null) {
      context.setInitParameter(EnvironmentKey, env)
      logger.info(s"Scalatra environment set to ${env}")
    }

    logger.info(s"ScalatraBootstrap init complete")
  }


}
