package com.gainstrack.quotes.av

import java.time.{Duration, Instant}

import com.gainstrack.core._
import com.gainstrack.report.{AssetPair, PriceState}

object Main {
  def main(args: Array[String]): Unit = {
    val startTime = Instant.now

    val gbpPriceState =StockParser.parseSymbol("GBP", AssetId("USD"))(PriceState())

    val symbol = "VWRD.LON"
    val ccy = AssetId(symbol)

    val baseCcy = StockParser.parseCurrency(symbol)
    val priceState = StockParser.parseSymbol(symbol, baseCcy)(gbpPriceState)
    val prices = priceState.prices(AssetPair(symbol, "USD"))
    val endTime = Instant.now
    val duration = Duration.between(startTime, endTime)

    prices.foreach(kv => {
      println(s"${kv._1} ${kv._2.toDouble.formatted("%.2f")}")
    })
    println(s"Duration: ${duration.toMillis/1000.0}s")
  }
}
