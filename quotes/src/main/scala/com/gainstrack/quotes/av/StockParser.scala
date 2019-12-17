package com.gainstrack.quotes.av

import com.gainstrack.command.PriceObservation
import com.gainstrack.core._
import com.gainstrack.report.{AssetPair, FXConverter, PriceState, SingleFXConversion}
import spire.math.Rational

import scala.collection.SortedMap

object StockParser {

  def parseIntradayRefQuote(config: QuoteConfig): Option[Fraction] = {
    val symbol = config.symbol

    try {
      val intraday = parseSymbol(config.copy(symbol = s"intraday.$symbol"))
      Some(intraday.liveQuote)
    }
    catch {
      case _: Exception => None
    }

  }

  def tryParseSymbol(cfg: QuoteConfig): Option[StockParseResult] = {
    try {
      val res = StockParser.parseSymbol(cfg)
      Some(res)
    }
    catch {
      case e: Exception => {
        println(e.toString)
        None
      }
    }
  }

  def parseSymbol(config: QuoteConfig):StockParseResult = {
    val symbol = config.symbol

    val assetId = AssetId(symbol)
    val src = scala.io.Source.fromFile(s"db/${symbol}.csv")
    val it1 = src.getLines()
    val headers = it1.next().split(",").map(_.trim)
    val dateIndex = headers.indexOf("timestamp")
    require(dateIndex>=0, s"timestamp column not found for $symbol")
    val closeIndex = headers.indexOf("close")
    require(closeIndex>=0, s"close column not found for $symbol")
    val refPriceStr = it1.next().split(",").map(_.trim).apply(closeIndex)
    val liveQuote = parseIntradayRefQuote(config).getOrElse(parseNumber(refPriceStr))
    require(!liveQuote.isZero, s"close for ${symbol} zero in ${refPriceStr} for line")
    val buildMap = SortedMap.newBuilder[LocalDate, Fraction]

    for (line<-src.getLines().drop(2)) {
      val parts = line.split(",").map(_.trim)
      val date = parseDate(parts(dateIndex))
      val value = parseNumber(parts(closeIndex))
      buildMap+=(date -> value)
    }
    val map:SortedMap[LocalDate, Fraction] = buildMap.result()
    StockParseResult(series = map, liveQuote = liveQuote, config = config)
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

case class StockParseResult(series:SortedMap[LocalDate, Fraction], liveQuote:Fraction, config: QuoteConfig) {
  def fixupLSE(lseCcy:String, actualCcy:AssetId, priceState: FXConverter) : StockParseResult = {
    // LSE ETFs on alpha-vantage are declared as being in in USD
    // and historics are a mix of USD and GBp (pence)
    require(!liveQuote.isZero)

    val builder = SortedMap.newBuilder[LocalDate, Fraction]
    var refPrice = liveQuote

    series.foreach(kv => {
      val amount = kv._2
      val date = kv._1
      val corrected:Fraction = lseCcy match {
        case "LSEUSD" => {
          if (amount / refPrice > 10) {
            val gbp = amount / 100 // GBP/GBX
            val usd = priceState.getFX(AssetId("GBP"), actualCcy, date).getOrElse(0.0) * gbp
            usd
          }
          else {
            amount
          }
        }
        case "LSEGBP" => {
          if (amount / refPrice > 10) {
            amount / 100 // GBP/GBX
          }
          else {
            amount
          }
        }
        case "GBX" => {
          val gbp = amount / 100
          gbp
        }
        case _ => amount
      }

      refPrice = corrected
      builder += (date -> corrected)
    })

    this.copy(series = builder.result())
  }
}