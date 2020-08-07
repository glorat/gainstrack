package controllers

import com.gainstrack.core.{AssetId, SortedColumnMap}
import com.gainstrack.quotes.av.Main.{infDur, theStore}
import com.gainstrack.quotes.av.{QuoteConfig, SyncUp}
import com.gainstrack.web.{GainstrackJsonSerializers, TimingSupport}
import org.json4s.Formats
import org.scalatra.json.JacksonJsonSupport
import org.scalatra.{AsyncResult, FutureSupport, NotFound, ScalatraServlet}
import org.slf4j.LoggerFactory

import scala.concurrent.{Await, ExecutionContext, Future}

class QuotesAdminController(implicit val executor :ExecutionContext)
  extends ScalatraServlet with JacksonJsonSupport with TimingSupport with FutureSupport {
  val logger =  LoggerFactory.getLogger(getClass)

  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all
  logger.info("QuotesAdminController enabled in server")

  before() {
    contentType = formats("json")
  }

  get("/config") {
    QuoteConfig.allConfigsWithCcy
  }

  get("/ticker/:ticker") {
    new AsyncResult() {
      override val is: Future[_] = {
        val ticker = params("ticker")
        SyncUp.syncOneSymbol(ticker)
      }
    }

  }

  post("/subsync") {
    val body = parsedBody.extract[GooglePubSubRequest]
    val symbol = body.message.message
    new AsyncResult() {
      override val is: Future[_] = {
        SyncUp.syncOneSymbol(symbol)
      }
    }
  }


}

case class GooglePubSubMessage(attributes: Map[String, String], data: String, messageId: String) {
  def message:String = {
    new String(java.util.Base64.getDecoder.decode(data))
  }
}
case class GooglePubSubRequest(message: GooglePubSubMessage, subscription: String)