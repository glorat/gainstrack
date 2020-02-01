package com.gainstrack.quotes.av

import java.nio.file.{Files, Paths}

import com.gainstrack.core._
import com.gainstrack.report.SingleFXConversion
import org.slf4j.LoggerFactory

import scala.collection.SortedMap

object SyncUp {
  val logger =  LoggerFactory.getLogger(getClass)

  val apikey = scala.io.Source.fromFile("db/apikey.txt").getLines().next()
  val throttleRequests = true


  def main(args: Array[String]): Unit = {

    Files.createDirectories(Paths.get("db/av"))
    Files.createDirectories(Paths.get("db/quotes"))

    val forceDownload = false

    downloadFromAlphaVantage(forceDownload)

    normaliseTheQuotes
  }

  private def downloadFromAlphaVantage(forceDownload: Boolean) = {
    def allCcys = QuoteConfig.allCcys

    allCcys.foreach(ccy => {
      val outFile = s"db/av/$ccy.csv"

      val cmd = s"""wget -O $outFile https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=$ccy&to_symbol=USD&outputsize=full&datatype=csv&apikey=$apikey"""

      goGetIt(outFile, cmd, forceDownload)

    })

    QuoteConfig.allConfigs.foreach(cfg => {
      val symbol = cfg.symbol
      val outFile = s"db/av/$symbol.csv"
      val cmdDaily = s"""wget -O $outFile https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=$symbol&outputsize=full&datatype=csv&apikey=$apikey"""
      goGetIt(outFile, cmdDaily, forceDownload)
      val outFileIntraday = s"db/av/intraday.$symbol.csv"
      val cmdIntraday = s"""wget -O $outFileIntraday https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=$symbol&interval=60min&datatype=csv&apikey=$apikey"""
      goGetIt(outFileIntraday, cmdIntraday, forceDownload)
    })
  }

  private def goGetIt(outFile:String, cmd:String, forceDownload:Boolean) = {
    import sys.process._

    val path = Paths.get(outFile)
    val exists = Files.exists(path)
    if (!exists || forceDownload) {
      println(cmd)
      val result = cmd !!

      if (throttleRequests) {
        // Free access limits to 5 request per second
        Thread.sleep(12000)
      }
    }
    else {
      logger.warn(s"Skipping $outFile")
    }

    // Quick and dirty heuristic corruption check (e.g. throttle limit hit)
//    val size = java.nio.file.Files.size(path)
//    if (size < 500) {
//      scala.io.Source.fromFile(outFile).getLines().foreach(println(_))
//      Files.delete(path)
//    }
  }


  // Read quotes from sources like av and put it into standard form
  def normaliseTheQuotes = {
    val isoCcys = QuoteConfig.allCcys
    // First sort out all the ISO currencies
    val data:Map[AssetId, SortedColumnMap[LocalDate, Double]] = isoCcys.flatMap(fxCcy => {
      AVStockParser.tryParseSymbol(QuoteConfig(fxCcy, "USD", "USD") ).map(res =>{
        val series: SortedMap[LocalDate, Double] = res.series
        QuoteStore.mergeQuotes(fxCcy, series)
        // Convert to FX conversion format
        val fast = SortedColumnMap.from(series)
        AssetId(fxCcy) -> fast
      })
    }).toMap

    // We need a converter in order to fixup borked quotes
    val priceFXConverter = SingleFXConversion(data, AssetId("USD"))

    val reses = QuoteConfig
      .allConfigs
      // .filter(_.symbol == "XIU.TRT") // Uncomment here for debugging
      .flatMap(cfg => AVStockParser.tryParseSymbol(cfg))
      .foreach(res => {
        val cfg = res.config
        val fixed = res.fixupLSE(cfg.domainCcy, AssetId(cfg.actualCcy), priceFXConverter)
        QuoteStore.mergeQuotes(cfg.symbol, fixed.series)
      })

  }
}
