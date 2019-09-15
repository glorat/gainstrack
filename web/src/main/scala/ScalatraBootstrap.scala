import controllers.Hello
import org.scalatra._
import javax.servlet.ServletContext

import scala.concurrent.ExecutionContext

class ScalatraBootstrap extends LifeCycle {

  override def init(context: ServletContext) {
    implicit val ec :ExecutionContext = ExecutionContext.global
    context.mount(new controllers.MainController(), "/*")
    context.mount(new controllers.CommandController(), "/gainstrack/command/*")
    context.mount(new controllers.ApiController(), "/gainstrack/api/*")
    context.mount(new controllers.AccountController(), "/gainstrack/gt_account/*")
    //context.mount(new controllers.Ledger, "/ledger/*")
  }

}
