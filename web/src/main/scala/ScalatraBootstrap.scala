import org.scalatra._
import javax.servlet.ServletContext

import scala.concurrent.ExecutionContext

class ScalatraBootstrap extends LifeCycle {

  override def init(context: ServletContext) {
    implicit val ec :ExecutionContext = ExecutionContext.global
    context.mount(new controllers.ApiController(), "/gainstrack/api/*")
    context.mount(new controllers.CommandApiController(), "/api/post/*")
    context.mount(new controllers.ApiController(), "/api/*")
    //context.mount(new controllers.Ledger, "/ledger/*")
  }

}
