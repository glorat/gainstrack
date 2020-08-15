import java.net.InetAddress

import com.gainstrack.quotes.av.SyncUp
import com.gainstrack.web.Auth0Config.getClass
import com.typesafe.config.ConfigFactory
import controllers.ServerQuoteSource
import io.grpc.ManagedChannelProvider
import io.grpc.netty.shaded.io.grpc.netty.NettyChannelProvider
import org.eclipse.jetty.server.Server
import org.eclipse.jetty.servlet.{DefaultServlet, ServletContextHandler}
import org.eclipse.jetty.webapp.WebAppContext
import org.scalatra.servlet.ScalatraListener
import org.slf4j.LoggerFactory

import scala.concurrent.ExecutionContext

object JettyLauncher { // this is my entry object as specified in sbt project definition
  val logger = LoggerFactory.getLogger(getClass)

  val config = ConfigFactory.load()

  def main(args: Array[String]) {
    primeJit()
    sanityCheck()

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

  /** This method is to assert various uber-jar classpath gotchas */
  def sanityCheck(): Unit = {
    val caller = classOf[io.grpc.ManagedChannelProvider]
    val cl = classOf[ManagedChannelProvider].getClassLoader
    // This can go wrong if META-INF is barfed for netty in the uber-jar merge
    val its = java.util.ServiceLoader.load(caller, cl)
    val it = its.iterator()
    require(it.hasNext, "Unable to ServiceLoader the NettyChannelProvider")
    logger.debug("We have a " + it.next.getClass.getName)

    if (config.getBoolean("gainstrack.sanityCheck.dns")) {
      // Check that DNS is working
      // dscacheutil -flushcache
      // might help on MacOS if this is failing
      require(InetAddress.getAllByName("google.com").length > 0)
      require(InetAddress.getAllByName("firestore.googleapis.com").length > 0)
    }

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
    implicit val ec = ExecutionContext.fromExecutor(scheduler)

    val quoteSyncThread = new Runnable() {
      override def run(): Unit = {
        try {
          SyncUp.batchSyncAll.map( _ => {
            ServerQuoteSource.updateDB
          })
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