package com.gainstrack.quotes.av

import java.nio.file.attribute.FileTime
import java.nio.file.{Files, Path, Paths}
import java.time.temporal.ChronoUnit
import java.time.Instant
import java.util.concurrent.TimeUnit

import com.gainstrack.core._
import com.gainstrack.report.SingleFXConversion
import com.google.cloud.pubsub.v1.Publisher
import com.google.pubsub.v1.{PubsubMessage, TopicName}
import com.typesafe.config.ConfigFactory
import org.slf4j.LoggerFactory

import scala.collection.immutable.SortedMap
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, ExecutionContext, Future}

class SyncUp(implicit ec: ExecutionContext) {
  val logger = LoggerFactory.getLogger(getClass)


  val throttleRequests = true
  private val inFlight = scala.collection.concurrent.TrieMap[String, Int]()
  private val infDur = scala.concurrent.duration.Duration.Inf
  private val alphaVantageTimeGap = java.time.Duration.ofSeconds(12) // 12 second throttle
  private var lastAlphaVantageDownload: Instant = Instant.now().minusSeconds(5) // It took 5 secs to start up since last crash
  private val quoteConfigDB = new QuoteConfigDB()

  Files.createDirectories(Paths.get("db/av"))
  Files.createDirectories(Paths.get("db/quotes"))

  // Flip this to FileStore as needed!
  val config = ConfigFactory.load()
  val theStore: QuoteStore = if (config.getBoolean("quotes.useDb")) QuotesDb else QuotesFileStore
  logger.info(s"SyncUp using QuoteStore of type ${theStore.getClass.getSimpleName}")
  def apikey = config.getString("quotes.avApiKey")

  def batchSyncAll = {
    val forceDownload = false
    downloadFromAlphaVantage(forceDownload)
    normaliseTheQuotes
  }

  private def googlePublishOneSync(publisher: Publisher, symbol: String) = {
    val data = com.google.protobuf.ByteString.copyFromUtf8(symbol)
    val pubsubMessage = PubsubMessage.newBuilder().setData(data).build
    val fut = publisher.publish(pubsubMessage)
    Future[String] {
      val messageId = fut.get
      logger.info(s"${symbol} request published with id ${messageId}")
      messageId
    }
  }
  def googlePublishOneSync(symbol:String):Future[String] = {
    val publisher = Publisher.newBuilder(TopicName.of("gainstrack", "quoteSync")).build()
    googlePublishOneSync(publisher, symbol).map(x => {
      publisher.shutdown()
      x
    })
  }

  def googlePublishAllSyncs():Future[String] = {
    val symbols = quoteConfigDB.allCcys ++ quoteConfigDB.allConfigs.map(_.id)
    logger.info(s"Publishing requests for " + symbols.mkString(","))
    googlePublishOneSync(symbols.mkString(","))

  }

  def syncOneSymbol(symbol: String): Future[QuotesMergeResult] = {
    quoteConfigDB.allConfigsWithCcy.find(_.id == symbol).map(quoteConfig => {
      this.downloadForQuote(quoteConfig, forceDownload = true)

      // Always need EUR & GBP for LSE fixup
      val fxData = Main.isoCcyPriceFxConverterData(Set(quoteConfig.ccy, "GBP", "EUR").toSeq)
      val priceFXConverter = SingleFXConversion(fxData, AssetId("USD"))

      AVStockParser.tryParseSymbol(quoteConfig)
        .map(res => {
          val cfg = res.config
          val domainCcy = cfg.avConfigOpt.map(_.meta).flatMap(x => if (x=="") None else Some(x)).getOrElse(cfg.ccy)
          val srcCcy = res.sourceCcy.map(_.symbol).getOrElse(domainCcy)
          val fixed = res.fixupLSE(srcCcy, AssetId(cfg.ccy), priceFXConverter)
          val mergeRes = theStore.readQuotes(cfg.id).flatMap(orig => {
            theStore.mergeQuotes(cfg.id, orig, fixed.series)
          })
          mergeRes
        }).getOrElse(Future.successful(QuotesMergeResult(0, 0, Some("Could not obtain AV results"))))
    }).getOrElse(Future.successful(QuotesMergeResult(0, 0, Some("Unknown symbol"))))
  }

  private def downloadFromAlphaVantage(forceDownload: Boolean) = {
    def allCcys = quoteConfigDB.allCcys

    allCcys.foreach(ccy => {
      val outFile = s"db/av/$ccy.csv"

      val cmd = s"""wget -O $outFile https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=$ccy&to_symbol=USD&outputsize=full&datatype=csv&apikey=$apikey"""

      goGetIt(outFile, cmd, stdoutResult = false, forceDownload = forceDownload)

    })

    quoteConfigDB.allConfigs.foreach(cfg => {
      downloadForQuote(cfg, forceDownload)
    })
  }

  private def downloadForQuote(cfg: QuoteSource, forceDownload: Boolean) = {
    // TODO: Try first and if it fails, iterate to next
    cfg.sources match {
      case QuoteSourceSource("av", _ , _)::_ => downloadQuoteFromAlphaVantage(cfg, forceDownload)
      case QuoteSourceSource("investpy", _ , _)::_ => downloadQuoteFromInvestPy(cfg, forceDownload)
      case _ => ()
    }


  }

  private def downloadQuoteFromInvestPy(qs: QuoteSource, forceDownload: Boolean) = {
    val symbol = qs.id
    val icfg = qs.investPyConfig
    val ticker = if (icfg.ref != "") icfg.ref else qs.ticker
    val marketRegion = qs.marketRegion

    val country = marketRegion match {
      case "LN" => "united kingdom"
      case "NY" => "united states"
      case "HK" => "hong kong"
      case "CA" => "canada"
      case "SG" => "singapore"
      case "EU" => "netherlands" // Arbitrary choice here!
    }

    val outFile = s"db/av/$symbol.csv"
    val cmd = s"""python3 python/quotes.py ${ticker} "${country}""""
    goGetIt(outFile, cmd, stdoutResult = true, forceDownload = forceDownload)
  }

  private def downloadQuoteFromAlphaVantage(cfg: QuoteSource, forceDownload: Boolean) = {
    val symbol = cfg.id
    val outFile = s"db/av/$symbol.csv"
    val avSymbol = cfg.avConfig.ref
    val cmdDaily = if (cfg.marketRegion == "GLOBAL") {
      s"""wget -O $outFile https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=$avSymbol&to_symbol=USD&outputsize=full&datatype=csv&apikey=$apikey"""
    } else {
      s"""wget -O $outFile https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=$avSymbol&outputsize=full&datatype=csv&apikey=$apikey"""
    }

    goGetIt(outFile, cmdDaily, stdoutResult = false, forceDownload = forceDownload)
    //    val outFileIntraday = s"db/av/intraday.$symbol.csv"
    //    val cmdIntraday = s"""wget -O $outFileIntraday https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=$symbol&interval=60min&datatype=csv&apikey=$apikey"""
    //    goGetIt(outFileIntraday, cmdIntraday, forceDownload)
  }

  private def goGetIt(outFile: String, cmd: String, stdoutResult: Boolean, forceDownload: Boolean) = {
    import sys.process._

    val path: Path = Paths.get(outFile)
    val exists = Files.exists(path)
    val now = Instant.now
    val duration = java.time.Duration.ofHours(24)
    val lastModified: Instant = if (exists) Files.getLastModifiedTime(path).toInstant else now.plus(java.time.Duration.ofDays(100))
    if (!exists || forceDownload || lastModified.plus(duration).isBefore(Instant.now)) {
      val timeToSleep = java.time.Duration.between(lastAlphaVantageDownload, Instant.now).minus(alphaVantageTimeGap).negated()
      logger.info(s"timeToSleep: ${timeToSleep.toMillis}")
      if (throttleRequests && cmd.contains("alphavantage") && !timeToSleep.isNegative) {
        logger.info(s"Sleeping for ${timeToSleep.toMillis}ms to throttle alphavantage requests")
        Thread.sleep(timeToSleep.toMillis)
      }
      lastAlphaVantageDownload = Instant.now
      logger.info(cmd)
      import scala.language.postfixOps
      val result = if (stdoutResult) cmd #> path.toFile ! else cmd !

    }
    else {
      val delay = ChronoUnit.MINUTES.between(now, lastModified.plus(duration)) / 60.0
      logger.info(s"Skipping $outFile for ${delay.formatted("%.1f")} hrs")
    }

//     Quick and dirty heuristic corruption check (e.g. throttle limit hit)
    val size = java.nio.file.Files.size(path)
    if (size < 500) {
      val lines = scala.io.Source.fromFile(outFile).getLines();
      val one = lines.mkString("\n")
      if (one.contains("API call frequency")) {
        println("API call frequency hit")
        Files.delete(path)
      } else if (one.contains("Invalid API call")) {
        println("Invalid API call")
        Files.delete(path)
      } else if (size == 0) {
        println("Nothing downloaded")
        Files.delete(path)
      } else {
        println(one)
      }

    }
  }


  // Read quotes from sources like av and put it into standard form
  def normaliseTheQuotes = {
    val isoCcys = quoteConfigDB.allCcys
    // First sort out all the ISO currencies
    val data: Map[AssetId, SortedColumnMap[LocalDate, Double]] = isoCcys.flatMap(fxCcy => {
      AVStockParser.tryParseSymbol(QuoteConfig(fxCcy, "USD", "USD", "FX").toQuoteSource).map(res => {
        val series: SortedMap[LocalDate, Double] = res.series
        val fxFut = theStore.readQuotes(fxCcy).map(orig => {
          theStore.mergeQuotes(fxCcy, orig, series)
        })
        Await.result(fxFut, Duration.Inf)
        // Convert to FX conversion format
        val fast = SortedColumnMap.from(series)
        AssetId(fxCcy) -> fast
      })
    }).toMap

    // We need a converter in order to fixup borked quotes
    val priceFXConverter = SingleFXConversion(data, AssetId("USD"))

    val reses: Seq[Future[Any]] = quoteConfigDB
      .allConfigs
      // .filter(_.id == "BRK-B.NY") // Uncomment here for debugging
      .flatMap(cfg => AVStockParser.tryParseSymbol(cfg))
      .map(res => {
        val cfg = res.config
        val result = cfg.avConfigOpt.map(avConfig => {
          val actualCcy = cfg.ccy
          val domainCcy = cfg.avConfigOpt.map(_.meta).flatMap(x => if (x=="") None else Some(x)).getOrElse(cfg.ccy)
          val srcCcy = res.sourceCcy.map(_.symbol).getOrElse(domainCcy)
          val avSymbol = avConfig.ref
          val fixed = res.fixupLSE(srcCcy, AssetId(actualCcy), priceFXConverter)
          fixed
        }).getOrElse(res)

        val id = cfg.id

        theStore.readQuotes(id).map(orig => {
          theStore.mergeQuotes(id, orig, result.series)
        })
      })
    Future.sequence(reses)
  }
}
