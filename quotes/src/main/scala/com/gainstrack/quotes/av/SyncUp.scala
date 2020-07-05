package com.gainstrack.quotes.av

import java.nio.file.attribute.FileTime
import java.nio.file.{Files, Path, Paths}
import java.time.temporal.ChronoUnit
import java.time.{Duration, Instant}

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

      goGetIt(outFile, cmd, stdoutResult = false,  forceDownload = forceDownload)

    })

    QuoteConfig.allConfigs.foreach(cfg => {
      downloadForQuote(cfg, forceDownload)
    })
  }

  private def downloadForQuote(cfg: QuoteConfig, forceDownload: Boolean) = {
    if (cfg.exchange == QuoteExchange("LON")) {
      downloadQuoteFromInvestPy(cfg, forceDownload)
    } else {
      downloadQuoteFromAlphaVantage(cfg, forceDownload)
    }

  }

  private def downloadQuoteFromInvestPy(cfg: QuoteConfig, forceDownload: Boolean) = {
    val symbol = cfg.avSymbol
    val ticker = cfg.ticker

    val outFile = s"db/av/$symbol.csv"
    val cmd = s"""python3 python/quotes.py ${ticker}"""
    goGetIt(outFile, cmd, stdoutResult = true, forceDownload = forceDownload)
  }

  private def downloadQuoteFromAlphaVantage(cfg: QuoteConfig, forceDownload: Boolean) = {
    val symbol = cfg.avSymbol
    val outFile = s"db/av/$symbol.csv"
    val cmdDaily = s"""wget -O $outFile https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=$symbol&outputsize=full&datatype=csv&apikey=$apikey"""
    goGetIt(outFile, cmdDaily, stdoutResult = false, forceDownload = forceDownload)
//    val outFileIntraday = s"db/av/intraday.$symbol.csv"
//    val cmdIntraday = s"""wget -O $outFileIntraday https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=$symbol&interval=60min&datatype=csv&apikey=$apikey"""
//    goGetIt(outFileIntraday, cmdIntraday, forceDownload)
  }

  private def goGetIt(outFile:String, cmd:String, stdoutResult:Boolean, forceDownload:Boolean) = {
    import sys.process._

    val path: Path = Paths.get(outFile)
    val exists = Files.exists(path)
    val now = Instant.now
    val duration = Duration.ofHours(24)
    val lastModified:Instant = if (exists) Files.getLastModifiedTime(path).toInstant else now.plus(Duration.ofDays(100))
    if (!exists || lastModified.plus(duration).isBefore(Instant.now)) {
      logger.info(cmd)
      val result = if (stdoutResult) cmd #> path.toFile ! else cmd !

      if (throttleRequests) {
        // Free access limits to 5 request per second
        Thread.sleep(12000)
      }
    }
    else {
      val delay = ChronoUnit.MINUTES.between(now, lastModified.plus(duration))/60.0
      logger.info(s"Skipping $outFile for ${delay.formatted("%.1f")} hrs")
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
      // .filter(_.avSymbol == "VWRL.LON") // Uncomment here for debugging
      .flatMap(cfg => AVStockParser.tryParseSymbol(cfg))
      .foreach(res => {
        val cfg = res.config
        val srcCcy = res.sourceCcy.map(_.symbol).getOrElse(cfg.domainCcy)
        val fixed = res.fixupLSE(srcCcy, AssetId(cfg.actualCcy), priceFXConverter)
        QuoteStore.mergeQuotes(cfg.avSymbol, fixed.series)
      })

  }
}
