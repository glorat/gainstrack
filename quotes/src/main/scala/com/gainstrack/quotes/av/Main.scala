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
      val res = StockParser.parseSymbol(fxCcy)
      val series: SortedMap[LocalDate, Fraction] = res.series
      AssetPair(fxCcy, "USD") -> series
    }).toMap
    val priceState = PriceState(isoCcys.map(AssetId(_)).toSet, allSeries)

    val symbol = "VWRD.LON"
    val res = StockParser.parseSymbol(symbol)
      .fixupLSE(priceState)

    val newState = priceState.withUpdatedSeries(AssetPair(symbol, "USD"), res.series)
    newState
  }
}
