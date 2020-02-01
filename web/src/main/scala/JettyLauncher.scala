import org.eclipse.jetty.server.Server
import org.eclipse.jetty.servlet.{DefaultServlet, ServletContextHandler}
import org.eclipse.jetty.webapp.WebAppContext
import org.scalatra.servlet.ScalatraListener

object JettyLauncher { // this is my entry object as specified in sbt project definition
  def main(args: Array[String]) {
    primeJit()

    val port = if(System.getenv("PORT") != null) System.getenv("PORT").toInt else 9050

    val server = new Server(port)
    val context = new WebAppContext()
    context setContextPath "/"
    context.setResourceBase("src/main/webapp")
    context.addEventListener(new ScalatraListener)
    context.getSessionHandler.setMaxInactiveInterval(12*60*60) // 12 hour sessions
    context.addServlet(classOf[DefaultServlet], "/")

    server.setHandler(context)

    server.start
    server.join
  }

  // This method is to get this out of the way right at the start because
  // compiling this one method apparently requires 400MB of RAM
  // -                    Thread (reserved=394152KB, committed=394152KB)
  //                            (thread #33)
  //                            (stack: reserved=32768KB, committed=32768KB)
  //                            (malloc=99KB #170)
  //                            (arena=361285KB #65)
  private def primeJit(): Unit = {
    import com.gainstrack.core._
    val interp = new TimeSeriesInterpolator
    val timeSeries2: SortedColumnMap[LocalDate, Double] = SortedColumnMap()
    interp.interpValueDouble(timeSeries2, today())
  }
}