package controllers

import java.time.LocalDate

import com.gainstrack.core.AssetId
import com.gainstrack.quotes.av.QuoteConfig
import com.gainstrack.web.{GainstrackJsonSerializers, TimingSupport}
import org.json4s.Formats
import org.scalatra.json.JacksonJsonSupport
import org.scalatra.{ContentEncodingSupport, NotFound, ScalatraServlet}
import org.slf4j.LoggerFactory

import scala.concurrent.ExecutionContext
import scala.util.Try

class QuotesController(implicit val ec :ExecutionContext)
  extends ScalatraServlet
    with JacksonJsonSupport
    with TimingSupport
    with ContentEncodingSupport {

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
    val fromDateOpt: Try[LocalDate] = Try(LocalDate.parse(this.params("fromDate")))

    fx.data.get(AssetId(ticker))
      .map ( data => {
        fromDateOpt.map(fromDate => {
          val mask = data.ks.map(!_.isBefore(fromDate))
          val ks = data.ks.zip(mask).filter(_._2).map(_._1)
          val vs = data.vs.zip(mask).filter(_._2).map(_._1)
          Map("x" -> ks, "y" -> vs, "name" -> ticker)
        }).getOrElse(Map("x" -> data.ks, "y" -> data.vs, "name" -> ticker))

    }).getOrElse(
      Map("x" -> Seq(), "y" -> Seq(), "name" -> ticker)
      // NotFound(s"${ticker} does not exist")
    )
  }

}
