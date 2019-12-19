package com.gainstrack.quotes.av

import java.time.{Duration, Instant}

import com.gainstrack.core._
import com.gainstrack.report.{AssetChainMap, AssetPair, FXConverter, PriceFXConverter, PriceState, SingleFXConversion}

import scala.collection.SortedMap

object Main {
  def main(args: Array[String]): Unit = {
    import spire.implicits._

    // Prime it first so we can measure
    doTheWork

    val startTime = Instant.now
    val res: DbState = doTheWork
    val baseCcySymbol = "USD"
    val singleFXConversion = res.singleFxConverter(AssetId(baseCcySymbol))
    val endTime = Instant.now
    val duration = Duration.between(startTime, endTime)

//    res.priceFXConverter.prices(AssetPair("VWRL.LON","GBP")).foreach(kv => {
//      val toBase = singleFXConversion.getFX("VWRL.LON",baseCcySymbol,kv._1).get.formatted("%.2f")
//      println(s"${kv._1} ${kv._2.toDouble.formatted("%.2f")} $toBase")
//    })
    println(s"Duration: ${duration.toMillis/1000.0}s")
  }

  def doTheWork:DbState = {
    val isoCcys = QuoteConfig.allCcys
    val data:Map[AssetId, SortedColumnMap[LocalDate, Double]] = isoCcys.flatMap(fxCcy => {
      StockParser.tryParseSymbol[Double](QuoteConfig(fxCcy, "USD", "USD") ).map(res =>{
        val series: SortedMap[LocalDate, Double] = res.series
        val fast = SortedColumnMap.from(series)
        AssetId(fxCcy) -> fast
      })
    }).toMap


    val priceFXConverter = SingleFXConversion(data, AssetId("USD"))

    val reses = QuoteConfig.allConfigs.flatMap(cfg => StockParser.tryParseSymbol[Double](cfg))

    val finalState = reses.foldLeft(data)((dataSoFar, res) => {
      val cfg = res.config
      val fixed = res.fixupLSE(cfg.domainCcy, AssetId(cfg.actualCcy), priceFXConverter)
      val usdSeries = fixed.series.map(kv => kv._1 -> kv._2 * priceFXConverter.getFX(cfg.actualCcy, "USD", kv._1).get)
      val fastUsd = SortedColumnMap.from(usdSeries)
      dataSoFar.updated( AssetId(cfg.symbol), fastUsd)
    })

    DbState(SingleFXConversion(finalState, AssetId("USD")))
  }
}



case class DbState(priceFXConverter: SingleFXConversion) {

  def singleFxConverter(baseCurrency:AssetId): SingleFXConversion = {
    priceFXConverter
  }
}