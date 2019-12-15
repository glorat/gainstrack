package com.gainstrack.quotes.av

import java.time.{Duration, Instant}

import com.gainstrack.core._
import com.gainstrack.report.{AssetPair, PriceState}

import scala.collection.SortedMap

object Main {
  def main(args: Array[String]): Unit = {

    // Prime it first so we can measure
    doTheWork

    val startTime = Instant.now
    val newState: PriceState = doTheWork
    val endTime = Instant.now
    val duration = Duration.between(startTime, endTime)

    newState.prices(AssetPair("VWRD.LON","GBP")).foreach(kv => {
      println(s"${kv._1} ${kv._2.toDouble.formatted("%.2f")}")
    })
    println(s"Duration: ${duration.toMillis/1000.0}s")
  }

  private def doTheWork = {
    val isoCcys = Seq("GBP", "HKD")
    val allSeries: Map[AssetPair, SortedMap[LocalDate, Fraction]] = isoCcys.map(fxCcy => {
      val series: SortedMap[LocalDate, Fraction] = StockParser.parseSymbol(fxCcy, AssetId("USD"))(PriceState())
      AssetPair(fxCcy, "USD") -> series
    }).toMap
    val priceState = PriceState(isoCcys.map(AssetId(_)).toSet, allSeries)

    val symbol = "VWRD.LON"
    val ccy = AssetId(symbol)

    val baseCcy = StockParser.parseCurrency(symbol)
    val prices = StockParser.parseSymbol(symbol, baseCcy)(priceState)
    // FIXME: baseCcy is wrong in some cases - it gets fixed up
    val newState = priceState.withUpdatedSeries(AssetPair(AssetId(symbol), baseCcy), prices)
    newState
  }
}
