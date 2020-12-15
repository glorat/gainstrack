package com.gainstrack.quotes.av

import scala.concurrent.duration.{Duration, MINUTES}
import scala.concurrent.{Await, ExecutionContext, Future}

case class QuoteSourceSource(sourceType: String = "", ref: String = "", meta: String = "")

case class QuoteSource(
                        id: String,
                        name: String = "",
                        ticker: String = "",
                        marketRegion: String = "",
                        ccy: String = "",
                        sources: Seq[QuoteSourceSource] = Seq()) {
  def avConfigOpt = {
    sources.find(_.sourceType == "av")
  }

  def avConfig = {
    avConfigOpt.get
  }

  def investPyConfig = {
    sources.find(_.sourceType == "investpy").get
  }
}

case class Asset(name: String, assetType: String)

object QuoteSource {
  def getAllQuoteSourcesAsync()(implicit ec: ExecutionContext): Future[Seq[QuoteSource]] = {
    import sttp.client3._
    import sttp.client3.json4s._
    import sttp.client3.asynchttpclient.future.AsyncHttpClientFutureBackend
    implicit val serialization = org.json4s.jackson.Serialization
    implicit val formats = org.json4s.DefaultFormats

    val backend = AsyncHttpClientFutureBackend()
//    val baseUrl = "http://localhost:5001/gainstrack/asia-northeast1"
    val baseUrl = "https://asia-northeast1-gainstrack.cloudfunctions.net/getAllQuoteSources"

    val response = basicRequest
      .get(uri"$baseUrl/getAllQuoteSources")
      .response(asJson[Seq[QuoteSource]])
      .send(backend)

    val ret = response.map(res => {
      val foo: Either[ResponseException[String, Exception], Seq[QuoteSource]] = res.body
      backend.close()
      val qs = foo match {
        case Left(ex) => throw ex
        case Right(value) => value
      }
      qs
    })

    ret
  }

  def getAllQuoteSources()(implicit ec: ExecutionContext): Seq[QuoteSource] = {
    // A synchronous wait. Not exactly recommended so only use if needed e.g on startup
    Await.result(getAllQuoteSourcesAsync(), Duration(1, MINUTES))
  }

  def main(args: Array[String]): Unit = {
    import scala.concurrent.ExecutionContext.Implicits.global
    val qs = QuoteSource.getAllQuoteSourcesAsync()
    Await.result(qs, Duration.Inf)
    println(qs)
  }
}