package com.gainstrack.quotes.av

import java.time.{Duration, Instant}

import com.gainstrack.core._
import com.gainstrack.report.{AssetChainMap, AssetPair, PriceState, SingleFXConversion}

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

    res.priceState.prices(AssetPair("VWRL.LON","GBP")).foreach(kv => {
      val toBase = singleFXConversion.getFX("VWRL.LON",baseCcySymbol,kv._1).get.formatted("%.2f")
      println(s"${kv._1} ${kv._2.toDouble.formatted("%.2f")} $toBase")
    })
    println(s"Duration: ${duration.toMillis/1000.0}s")
  }

  def doTheWork:DbState = {
    val isoCcys = QuoteConfig.allCcys
    val ccySeries = isoCcys.flatMap(fxCcy => {
      StockParser.tryParseSymbol(QuoteConfig(fxCcy, "USD", "USD") ).map(res =>{
        val series: SortedMap[LocalDate, Fraction] = res.series
        AssetPair(fxCcy, "USD") -> series
      })
    })
    val inverseSeries = ccySeries.map(kv => kv._1.reverse -> kv._2.mapValues(_.inverse))
    val allSeries = (ccySeries ++ inverseSeries).toMap
    val priceState = PriceState(isoCcys.map(AssetId(_)).toSet, allSeries)

    val reses = QuoteConfig.allConfigs.flatMap(cfg => StockParser.tryParseSymbol(cfg))

    val finalState = reses.foldLeft(priceState)((pState, res) => {
      val cfg = res.config
      val fixed = res.fixupLSE(cfg.domainCcy, AssetId(cfg.actualCcy), priceState)
      pState.withUpdatedSeries(AssetPair(cfg.symbol, cfg.actualCcy), fixed.series)
    })

    DbState(finalState)
  }
}



case class DbState(priceState: PriceState) {
  private def inferredChain(baseCurrency:AssetId) : AssetChainMap = {
    val pairs = priceState.prices.keys
    val inferredChain = pairs.map(pair => AccountId("Assets:Dummy").subAccount(pair.fx1) -> Seq(pair.fx1, pair.fx2, baseCurrency.symbol).map(AssetId(_)))
    AssetChainMap(inferredChain.toMap)
  }

  def singleFxConverter(baseCurrency:AssetId): SingleFXConversion = {
    val chain = inferredChain(baseCurrency)
    SingleFXConversion.generate(baseCurrency)(priceState, chain)
  }
}