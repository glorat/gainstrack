package controllers

import com.gainstrack.core.AssetId
import com.gainstrack.quotes.av.QuoteConfig
import com.gainstrack.web.GainstrackJsonSerializers
import org.json4s.Formats
import org.scalatra.json.JacksonJsonSupport
import org.scalatra.{NotFound, ScalatraServlet}
import org.slf4j.LoggerFactory

import scala.concurrent.ExecutionContext

class QuotesController(implicit val ec :ExecutionContext)
  extends ScalatraServlet with JacksonJsonSupport {
  val logger =  LoggerFactory.getLogger(getClass)

  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all

  before() {
    contentType = formats("json")
  }

  get("/config") {
    QuoteConfig.allConfigsWithCcy
  }

  get("/ticker/:ticker") {
    val fx = ServerQuoteSource.db.priceFXConverter
    val ticker = params("ticker")
    fx.data.get(AssetId(ticker))
      .map ( data => {
        Map("x" -> data.ks, "y" -> data.vs, "name" -> ticker)
    }).getOrElse(
      NotFound(s"${ticker} does not exist")
    )
  }

}
