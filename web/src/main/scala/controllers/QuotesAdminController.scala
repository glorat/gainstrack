package controllers

import com.gainstrack.core.{AssetId, GainstrackJsonSerializers, SortedColumnMap}
import com.gainstrack.quotes.av.Main.{infDur, theStore}
import com.gainstrack.quotes.av.{QuoteConfig, QuoteConfigDB, QuotesMergeResult, SyncUp}
import com.gainstrack.web.TimingSupport
import org.json4s.Formats
import org.scalatra.json.JacksonJsonSupport
import org.scalatra.{AsyncResult, FutureSupport, NotFound, ScalatraServlet}
import org.slf4j.LoggerFactory

import scala.concurrent.{Await, ExecutionContext, Future}

class QuotesAdminController(implicit val executor :ExecutionContext)
  extends ScalatraServlet with JacksonJsonSupport with TimingSupport with FutureSupport {
  val logger =  LoggerFactory.getLogger(getClass)
  val syncUp = new SyncUp()

  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all
  logger.info("QuotesAdminController enabled in server")

  before() {
    contentType = formats("json")
  }

  get("/config") {
    // Cache this?
    new QuoteConfigDB().allConfigsWithCcy
  }


  get("/ticker/:ticker") {
    new AsyncResult() {
      override val is: Future[_] = {
        val ticker = params("ticker")
        syncUp.syncOneSymbol(ticker)
      }
    }

  }

  post("/subsync") {

    new AsyncResult() {
      override val is: Future[_] = {
        try {
          logger.info(request.body)
          val body = parsedBody.extract[GooglePubSubRequest]
          logger.info(s"HANDLING published subsync message ${body.message.messageId}")
          val symbols = body.message.message.split(",").toList
          symbols match {
            case Nil => Future.successful(QuotesMergeResult(0,0,None))
            case symbol :: Nil => {
              logger.info(s"Requested to sync one symbol ${symbol}")
              syncUp.syncOneSymbol(symbol)
            }
            case symbol :: tail => {
              logger.info(s"Requested to sync one symbol ${symbol}")
              syncUp.syncOneSymbol(symbol).map(res => {
                val rest = tail.mkString(",")
                logger.info(s"Queuing up: ${rest}")
                syncUp.googlePublishOneSync(rest).map(_ => {
                  res
                })
              })
            }
          }



        }
        catch {
          case e: Exception => {
            logger.error("subsync stack: " + e.getStackTrace.mkString("\n"))
            logger.error("subsync error: " + e.toString, e)
            Future.successful(QuotesMergeResult(0,0, Some(e.toString)))
          }
        }

      }
    }
  }

  post("/syncall") {
    new AsyncResult() {
      override val is: Future[_] = {
        try {
          logger.info(request.body)
          syncUp.googlePublishAllSyncs.map(_ => "OK")
        } catch {
          case e: Exception => {
            logger.error("syncall dropping error: " + e.toString, e)
            Future.successful(e.toString)
          }
        }
      }
    }
  }

  error {
    case e:Exception => {
      logger.error("Unhandled error: " + e.toString, e)
    }
  }

}

case class GooglePubSubMessage(attributes: Option[Map[String, String]], data: String, messageId: String) {
  def message:String = {
    new String(java.util.Base64.getDecoder.decode(data))
  }
}
case class GooglePubSubRequest(message: GooglePubSubMessage, subscription: String)