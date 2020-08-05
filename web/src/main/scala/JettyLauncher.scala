import com.gainstrack.quotes.av.SyncUp
import controllers.ServerQuoteSource
import io.grpc.ManagedChannelProvider
import org.eclipse.jetty.server.Server
import org.eclipse.jetty.servlet.{DefaultServlet, ServletContextHandler}
import org.eclipse.jetty.webapp.WebAppContext
import org.scalatra.servlet.ScalatraListener

object JettyLauncher { // this is my entry object as specified in sbt project definition
  def main(args: Array[String]) {
    primeJit()

    println(s"Is android: ${isAndroid(classOf[ManagedChannelProvider].getClassLoader)}")

    val port = if(System.getenv("PORT") != null) System.getenv("PORT").toInt else 9050

    val server = new Server(port)
    val context = new WebAppContext()
    context setContextPath "/"
    context.setResourceBase("src/main/webapp")
    context.addEventListener(new ScalatraListener)
    context.getSessionHandler.setMaxInactiveInterval(12*60*60) // 12 hour sessions
    context.addServlet(classOf[DefaultServlet], "/")

    server.setHandler(context)

    // scheduleAVDownload

    server.start
    server.join
  }


  private def isAndroid(cl: ClassLoader) = try { // Specify a class loader instead of null because we may be running under Robolectric
    Class.forName("android.app.Application", /*initialize=*/ false, cl)
    true
  } catch {
    case e: Exception =>
      // If Application isn't loaded, it might as well not be Android.
      false
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

  private def scheduleAVDownload() = {
    import java.util.concurrent.Executors
    import java.util.concurrent.TimeUnit._

    val scheduler = Executors.newScheduledThreadPool(1)

    val quoteSyncThread = new Runnable() {
      override def run(): Unit = {
        try {
          SyncUp.main(Seq().toArray)
          ServerQuoteSource.updateDB
        }
        catch {
          case e:Exception => {
            Console.err.println("QuoteSyncUp failed this time")
            Console.err.println(e.toString)
          }
        }
      }
    }

    val sixHours = 6*60*60
    val beeperHandle = scheduler.scheduleAtFixedRate(quoteSyncThread, 10, sixHours, SECONDS)

  }
}