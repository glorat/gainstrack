package com.gainstrack.quotes.av

import com.gainstrack.command.PriceObservation
import com.gainstrack.core._
import com.gainstrack.report.{FXConverter, PriceState, SingleFXConversion}
import spire.math.Rational

import scala.collection.SortedMap

object StockParser {
  def parseSymbol(symbol:String, baseCcy:AssetId)(origQuotes: FXConverter):SortedMap[LocalDate, Fraction] = {
    val assetId = AssetId(symbol)
    val src = scala.io.Source.fromFile(s"db/${symbol}.csv")
    val it1 = src.getLines()
    val headers = it1.next().split(",").map(_.trim)
    val dateIndex = headers.indexOf("timestamp")
    require(dateIndex>=0, s"timestamp column not found for $symbol")
    val closeIndex = headers.indexOf("close")
    require(closeIndex>=0, s"close column not found for $symbol")
    val refPriceStr = it1.next().split(",").map(_.trim).apply(closeIndex)
    var refPrice = parseNumber(refPriceStr)
    require(!refPrice.isZero, s"close for ${symbol} zero in ${refPriceStr} for line")
    val buildMap = SortedMap.newBuilder[LocalDate, Fraction]

    for (line<-src.getLines().drop(2)) {
      val parts = line.split(",").map(_.trim)
      val date = parseDate(parts(dateIndex))
      val value = parseNumber(parts(closeIndex))
      val amount = Amount(value, baseCcy)
      val corrected = fixupAmount(amount, refPrice, date, origQuotes)
      if (!corrected.number.isZero) {refPrice = corrected.number}
      buildMap+=(date -> corrected.number)
    }
    val map:SortedMap[LocalDate, Fraction] = buildMap.result()
    map
  }

  private def fixupAmount(amount: Amount, refPrice:Fraction, date:LocalDate, priceState: FXConverter) : Amount = {
    // LSE ETFs on alpha-vantage are declared as being in in USD
    // and historics are a mix of USD and GBp (pence)
    if (refPrice.isZero){
      ???
    }
    if (amount.number / refPrice > 10) {
      val gbp = amount.number / 100
      val usd = priceState.getFX(AssetId("GBP"), AssetId("USD"), date).getOrElse(0.0) * gbp
      Amount(usd, AssetId("USD"))

    }
    else {
      // Fix the currency
      Amount(amount.number, AssetId("USD"))
    }
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
