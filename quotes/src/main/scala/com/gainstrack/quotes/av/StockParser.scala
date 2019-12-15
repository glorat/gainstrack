package com.gainstrack.quotes.av

import com.gainstrack.command.PriceObservation
import com.gainstrack.core._
import com.gainstrack.report.{FXConverter, PriceState, SingleFXConversion}
import spire.math.Rational

import scala.collection.SortedMap

object StockParser {

  def parseSymbol(symbol:String):StockParseResult = {
    val assetId = AssetId(symbol)
    val src = scala.io.Source.fromFile(s"db/${symbol}.csv")
    val it1 = src.getLines()
    val headers = it1.next().split(",").map(_.trim)
    val dateIndex = headers.indexOf("timestamp")
    require(dateIndex>=0, s"timestamp column not found for $symbol")
    val closeIndex = headers.indexOf("close")
    require(closeIndex>=0, s"close column not found for $symbol")
    val refPriceStr = it1.next().split(",").map(_.trim).apply(closeIndex)
    val liveQuote = parseNumber(refPriceStr)
    require(!liveQuote.isZero, s"close for ${symbol} zero in ${refPriceStr} for line")
    val buildMap = SortedMap.newBuilder[LocalDate, Fraction]

    for (line<-src.getLines().drop(2)) {
      val parts = line.split(",").map(_.trim)
      val date = parseDate(parts(dateIndex))
      val value = parseNumber(parts(closeIndex))
      buildMap+=(date -> value)
    }
    val map:SortedMap[LocalDate, Fraction] = buildMap.result()
    StockParseResult(series = map, liveQuote = liveQuote)
  }

  def parseCurrency(symbol: String):AssetId = {
    import org.json4s._
    import org.json4s.native.JsonMethods._
    implicit val formats = DefaultFormats

    val json = parse(scala.io.Source.fromFile(s"db/${symbol}.json").reader())
    val elem = (json \ "bestMatches")(0)
    val details = elem.extract[Map[String,String]]
    val currencyKey = details.keys.find(_.matches(".*currency.*"))
    AssetId(details(currencyKey.get))
  }
}

case class StockParseResult(series:SortedMap[LocalDate, Fraction], liveQuote:Fraction) {
  def fixupLSE(priceState: FXConverter) : StockParseResult = {
    // LSE ETFs on alpha-vantage are declared as being in in USD
    // and historics are a mix of USD and GBp (pence)
    require(!liveQuote.isZero)

    val builder = SortedMap.newBuilder[LocalDate, Fraction]
    var refPrice = liveQuote

    series.foreach(kv => {
      val amount = kv._2
      val date = kv._1
      val corrected = if (amount / refPrice > 10) {
        val gbp = amount / 100
        val usd = priceState.getFX(AssetId("GBP"), AssetId("USD"), date).getOrElse(0.0) * gbp
        usd
      }
      else {
        kv._2
      }
      builder += (date -> corrected)
    })

    this.copy(series = builder.result())
  }
}