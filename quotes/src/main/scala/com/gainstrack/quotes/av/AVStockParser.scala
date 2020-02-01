package com.gainstrack.quotes.av

import com.gainstrack.command.PriceObservation
import com.gainstrack.core._
import com.gainstrack.report.{AssetPair, FXConverter, PriceState, SingleFXConversion}

import scala.collection.SortedMap

object AVStockParser {
  type N = Double

  val x = 123

  trait FractionalParser {
    def parse(s:String): N
  }
//  implicit object FractionParser extends FractionalParser[Fraction] {
//    def parse(s:String):Fraction = parseNumber(s)
//  }

  implicit object DoubleParser extends FractionalParser {
    def parse(s:String) = s.toDouble
  }

  def parseIntradayRefQuote(config: QuoteConfig)(implicit fractionalParser:FractionalParser): Option[N] = {
    val symbol = config.symbol

    try {
      val intraday = parseSymbol(config.copy(symbol = s"intraday.$symbol"))
      Some(intraday.liveQuote)
    }
    catch {
      case _: Exception => None
    }

  }

  def tryParseSymbol(cfg: QuoteConfig)(implicit fractionalParser: FractionalParser): Option[StockParseResult] = {
    try {
      val res = AVStockParser.parseSymbol(cfg)
      Some(res)
    }
    catch {
      case e: Exception => {
        println(e.toString)
        None
      }
    }
  }

  def parseSymbol(config: QuoteConfig)(implicit fractionalParser: FractionalParser):StockParseResult = {
    val symbol = config.symbol

    val assetId = AssetId(symbol)
    val src = scala.io.Source.fromFile(s"db/av/${symbol}.csv")
    val it1 = src.getLines()
    val headers = it1.next().split(",").map(_.trim)
    val dateIndex = headers.indexOf("timestamp")
    require(dateIndex>=0, s"timestamp column not found for $symbol")
    val closeIndex = headers.indexOf("close")
    require(closeIndex>=0, s"close column not found for $symbol")
    val refPriceStr = it1.next().split(",").map(_.trim).apply(closeIndex)
    val liveQuote:N = parseIntradayRefQuote(config).getOrElse(fractionalParser.parse(refPriceStr))
    require(liveQuote != 0.0 , s"close for ${symbol} zero in ${refPriceStr} for line")
    val buildMap = SortedMap.newBuilder[LocalDate, N]

    for (line<-src.getLines().drop(2)) {
      val parts = line.split(",").map(_.trim)
      val date = parseDate(parts(dateIndex))
      val value = fractionalParser.parse(parts(closeIndex))
      buildMap+=(date -> value)
    }
    val map:SortedMap[LocalDate, N] = buildMap.result()
    StockParseResult(series = map, liveQuote = liveQuote, config = config)
  }

}

case class StockParseResult(series:SortedMap[LocalDate, Double], liveQuote:Double, config: QuoteConfig) {
  type N = Double

  def fixupLSE(lseCcy:String, actualCcy:AssetId, priceState: SingleFXConversion) : StockParseResult = {


    // LSE ETFs on alpha-vantage are declared as being in in USD
    // and historics are a mix of USD and GBp (pence)
    // FIXME: require(!liveQuote.isZero)

    val builder = SortedMap.newBuilder[LocalDate, N]
    var refPrice = liveQuote

    val minGbpUsdDouble = priceState.data(AssetId("GBP")).vs.min
    // This 1.1 assumes that daily LSEGBP movement does not exceed 10%. A tricky point...
    // TODO: A better way might be to use a reference symbol that is correct (e.g VWRD or VT)
    require(minGbpUsdDouble > 1.1, "GBP and USD are so close cannot distinguish feeds with mixed GBP and USD in them")
    val minGbpUsd = minGbpUsdDouble

    // Have to reverse because refPrice/liveQuote is today so we work backwards
    series.toSeq.reverse.foreach(kv => {
      val amount = kv._2
      val date = kv._1
      val corrected:N = lseCcy match {
        case "LSEUSD" => {
          // Can be GBX or USD
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
          // Can be a mixture of GBP/GBX/USD
          // Need a 3 way discriminator!!!
          if (amount / refPrice > 10) {
            amount / 100 // GBX -> GBP
          }
          else if ( (amount/refPrice) > minGbpUsd) {
            // USD -> GBP
            val usd = priceState.getFX(AssetId("USD"), AssetId("GBP"), date).getOrElse(0.0) * amount
            usd
          }
          else {
            // GBP
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