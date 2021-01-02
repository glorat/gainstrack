package com.gainstrack.quotes.av

import java.time.{Duration, Instant}

import com.gainstrack.core._
import com.gainstrack.quotes.av.SyncUp
import com.gainstrack.report.{AssetChainMap, AssetPair, FXConverter, PriceFXConverter, PriceState, SingleFXConversion}
import com.typesafe.config.ConfigFactory
import org.slf4j.LoggerFactory

import scala.collection.SortedMap
import scala.concurrent.{Await, ExecutionContext}

object Main {
  implicit val ec:ExecutionContext = ExecutionContext.global
  val infDur = scala.concurrent.duration.Duration.Inf
  val logger = LoggerFactory.getLogger(getClass)


  // Flip this to decide where the web server should get quotes from!
  val config = ConfigFactory.load()
  val theStore:QuoteStore = if (config.getBoolean("quotes.useDb")) QuotesDb else QuotesFileStore
  logger.info(s"Main using QuoteStore of type ${theStore.getClass.getSimpleName}")

  def main(args: Array[String]): Unit = {
    // Prime it first so we can measure
    doTheWork

    val startTime = Instant.now
    val singleFXConversion = doTheWork
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

  def isoCcyPriceFxConverterData(ccys: Seq[String]) = {
    val data:Map[AssetId, SortedColumnMap[LocalDate, Double]] = ccys.map(fxCcy => {
      val qts = Await.result(theStore.readQuotes(fxCcy), infDur)
      val fast = SortedColumnMap.from(qts)
      AssetId(fxCcy) -> fast
    }).toMap

    data
  }

  def doTheWork:SingleFXConversion = {
    val db = new QuoteConfigDB()
    val data:Map[AssetId, SortedColumnMap[LocalDate, Double]] = isoCcyPriceFxConverterData(db.allCcys)
    val priceFXConverter = SingleFXConversion(data, AssetId("USD"))

    val finalState = db
      .allConfigs
      .foldLeft(data)((dataSoFar, cfg) => {
        val series = Await.result(theStore.readQuotes(cfg.id), infDur)
        val usdSeries = series.flatMap(kv => {
          val fxOpt = priceFXConverter.getFX(cfg.ccy, "USD", kv._1)

          if (fxOpt.isEmpty) {
            println(s"No FX for ${cfg.ccy} at ${kv._1}")
          }

          fxOpt.map (fx => {
            kv._1 -> kv._2 * fx
          })
        })
        val fastUsd = SortedColumnMap.from(usdSeries)
        dataSoFar.updated(AssetId(cfg.id), fastUsd)
      })

    SingleFXConversion(finalState, AssetId("USD"))
  }

}
