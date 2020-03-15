package com.gainstrack.quotes.av

import java.time.{Duration, Instant}

import com.gainstrack.core._
import com.gainstrack.report.{AssetChainMap, AssetPair, FXConverter, PriceFXConverter, PriceState, SingleFXConversion}

import scala.collection.SortedMap

object Main {
  def main(args: Array[String]): Unit = {
    // Prime it first so we can measure
    doTheWork

    val startTime = Instant.now
    val res: DbState = doTheWork
    val baseCcySymbol = "USD"
    val singleFXConversion = res.singleFxConverter(AssetId(baseCcySymbol))
    val endTime = Instant.now
    val duration = Duration.between(startTime, endTime)

    val series = singleFXConversion.data(AssetId("VWRL.LON"))
    series.ks.zipWithIndex.foreach{
      case(dt, i) => {
        println(s"""$dt ${series.vs(i).formatted("%.2f")}""")
      }
    }

    println(s"Duration: ${duration.toMillis/1000.0}s")
  }


  def doTheWork:DbState = {
    val isoCcys = QuoteConfig.allCcys
    val data:Map[AssetId, SortedColumnMap[LocalDate, Double]] = isoCcys.map(fxCcy => {
      val fast = SortedColumnMap.from(QuoteStore.readQuotes(fxCcy))
      AssetId(fxCcy) -> fast
    }).toMap

    val priceFXConverter = SingleFXConversion(data, AssetId("USD"))

    val finalState = QuoteConfig
      .allConfigs
      .foldLeft(data)((dataSoFar, cfg) => {
        val series = QuoteStore.readQuotes(cfg.avSymbol)
        val usdSeries = series.flatMap(kv => {
          val fxOpt = priceFXConverter.getFX(cfg.actualCcy, "USD", kv._1)

          if (fxOpt.isEmpty) {
            println(s"No FX for ${cfg.actualCcy} at ${kv._1}")
          }

          fxOpt.map (fx => {
            kv._1 -> kv._2 * fx
          })
        })
        val fastUsd = SortedColumnMap.from(usdSeries)
        dataSoFar.updated(AssetId(cfg.avSymbol), fastUsd)
      })

    DbState(SingleFXConversion(finalState, AssetId("USD")))
  }

}



case class DbState(priceFXConverter: SingleFXConversion) {

  def singleFxConverter(baseCurrency:AssetId): SingleFXConversion = {
    priceFXConverter
  }
}