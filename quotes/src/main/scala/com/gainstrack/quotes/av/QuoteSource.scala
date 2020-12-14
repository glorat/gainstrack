package com.gainstrack.quotes.av

import scala.concurrent.duration.Duration
import scala.concurrent.{Await, ExecutionContext, Future}

case class QuoteSourceSource(sourceType: String = "", ref: String = "", meta: String = "")

case class QuoteSource(
                        id: String,
                        name: String = "",
                        ticker: String = "",
                        marketRegion: String = "",
                        ccy: String = "",
                        sources: Seq[QuoteSourceSource] = Seq()) {
  def avConfig = {
    sources.find(_.sourceType == "av").get
  }
}

case class Asset(name: String, assetType: String)

object QuoteSource {
  def foo()(implicit ec: ExecutionContext): Future[Seq[QuoteSource]] = {
    import sttp.client3._
    import sttp.client3.json4s._
    import sttp.client3.asynchttpclient.future.AsyncHttpClientFutureBackend
    implicit val serialization = org.json4s.jackson.Serialization
    implicit val formats = org.json4s.DefaultFormats

    val backend = AsyncHttpClientFutureBackend()
    val baseUrl = "http://localhost:5001/gainstrack/asia-northeast1"
    val response = basicRequest
      .get(uri"$baseUrl/getAllQuoteSources")
      .response(asJson[Seq[QuoteSource]])
      .send(backend)

    response.map(res => {
      val foo: Either[ResponseException[String, Exception], Seq[QuoteSource]] = res.body
      val qs = foo match {
        case Left(ex) => throw ex
        case Right(value) => value
      }
      qs
    })
  }

  def main(args: Array[String]): Unit = {
    import scala.concurrent.ExecutionContext.Implicits.global
    val qs = QuoteSource.foo()
    Await.result(qs, Duration.Inf)
    println(qs)
  }
}