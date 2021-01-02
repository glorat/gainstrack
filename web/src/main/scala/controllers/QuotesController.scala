package controllers

import java.time.LocalDate

import com.gainstrack.core.{AssetId, GainstrackJsonSerializers}
import com.gainstrack.quotes.av.{QuoteConfig, QuoteConfigDB}
import com.gainstrack.web.TimingSupport
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
    // Cache this?
    new QuoteConfigDB().allConfigsWithCcy
  }

  get("/ticker/:ticker") {
    val fx = ServerQuoteSource.db
    val ticker = params("ticker")
    val fromDateOpt: Try[LocalDate] = Try(LocalDate.parse(this.params("fromDate")))

    fx.data.get(AssetId(ticker))
      .map ( data => {
        fromDateOpt.map(fromDate => {
          val idx = data.iota(fromDate)
          if (idx>=0) {
            Map("x" -> data.ks.drop(idx), "y" -> data.vs.drop(idx), "name" -> ticker)
          } else {
            Map("x" -> Seq(data.ks.last), "y" -> Seq(data.vs.last), "name" -> ticker)
          }
//          val mask = data.ks.map(!_.isBefore(fromDate))
//          val ks = data.ks.zip(mask).filter(_._2).map(_._1)
//          val vs = data.vs.zip(mask).filter(_._2).map(_._1)
//          Map("x" -> ks, "y" -> vs, "name" -> ticker)
        }).getOrElse(Map("x" -> data.ks, "y" -> data.vs, "name" -> ticker))

    }).getOrElse(
      Map("x" -> Seq(), "y" -> Seq(), "name" -> ticker)
      // NotFound(s"${ticker} does not exist")
    )
  }

  post ("/tickers") {
    val body = parsedBody.extract[QuotesRequest]

    val fx = ServerQuoteSource.db
    val res = body.quotes.flatMap(req => {
      val ticker = req.name
      fx.data.get(AssetId(ticker)).flatMap(data => {
        req.fromDate.map(fromDate => {
          val idx = data.iota(fromDate)
          if (idx>=0) {
            Map("x" -> data.ks.drop(idx), "y" -> data.vs.drop(idx), "name" -> ticker)
          } else if (data.ks.length>0) {
            Map("x" -> Seq(data.ks.last), "y" -> Seq(data.vs.last), "name" -> ticker)
          } else {
            Map("x" -> Seq(), "y" -> Seq(), "name" -> ticker)
          }
        })
      })
    })
    res

  }

}

case class QuoteRequestConfig(name: String, fromDate: Option[LocalDate])
case class QuotesRequest(quotes: Seq[QuoteRequestConfig])
