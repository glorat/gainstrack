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

object SyncUp {
  val logger = LoggerFactory.getLogger(getClass)


  val throttleRequests = true
  private val inFlight = scala.collection.concurrent.TrieMap[String, Int]()
  private val infDur = scala.concurrent.duration.Duration.Inf
  private val alphaVantageTimeGap = java.time.Duration.ofSeconds(12) // 12 second throttle
  private var lastAlphaVantageDownload: Instant = Instant.now().minusSeconds(5) // It took 5 secs to start up since last crash

  Files.createDirectories(Paths.get("db/av"))
  Files.createDirectories(Paths.get("db/quotes"))

  // Flip this to FileStore as needed!
  val config = ConfigFactory.load()
  val theStore: QuoteStore = if (config.getBoolean("quotes.useDb")) QuotesDb else QuotesFileStore
  logger.info(s"SyncUp using QuoteStore of type ${theStore.getClass.getSimpleName}")
  def apikey = config.getString("quotes.avApiKey")

  def batchSyncAll(implicit ec: ExecutionContext) = {
    val forceDownload = false
    downloadFromAlphaVantage(forceDownload)
    normaliseTheQuotes
  }

  private def googlePublishOneSync(publisher: Publisher, symbol: String)(implicit ec: ExecutionContext) = {
    val data = com.google.protobuf.ByteString.copyFromUtf8(symbol)
    val pubsubMessage = PubsubMessage.newBuilder().setData(data).build
    val fut = publisher.publish(pubsubMessage)
    Future[String] {
      val messageId = fut.get
      logger.info(s"${symbol} request published with id ${messageId}")
      messageId
    }
  }
  def googlePublishOneSync(symbol:String)(implicit ec:ExecutionContext):Future[String] = {
    val publisher = Publisher.newBuilder(TopicName.of("gainstrack", "quoteSync")).build()
    googlePublishOneSync(publisher, symbol).map(x => {
      publisher.shutdown()
      x
    })
  }

  def googlePublishAllSyncs(implicit ec: ExecutionContext):Future[String] = {
    val symbols = QuoteConfig.allCcys ++ QuoteConfig.allConfigs.map(_.avSymbol)
    logger.info(s"Publishing requests for " + symbols.mkString(","))
    googlePublishOneSync(symbols.mkString(","))

  }

  def syncOneSymbol(symbol: String)(implicit ec: ExecutionContext): Future[QuotesMergeResult] = {
    QuoteConfig.allConfigsWithCcy.find(_.avSymbol == symbol).map(quoteConfig => {
      this.downloadForQuote(quoteConfig, forceDownload = true)

      // Always need EUR & GBP for LSE fixup
      val fxData = Main.isoCcyPriceFxConverterData(Set(quoteConfig.actualCcy, "GBP", "EUR").toSeq)
      val priceFXConverter = SingleFXConversion(fxData, AssetId("USD"))

      AVStockParser.tryParseSymbol(quoteConfig)
        .map(res => {
          val cfg = res.config
          val srcCcy = res.sourceCcy.map(_.symbol).getOrElse(cfg.domainCcy)
          val fixed = res.fixupLSE(srcCcy, AssetId(cfg.actualCcy), priceFXConverter)
          val mergeRes = theStore.readQuotes(cfg.avSymbol).flatMap(orig => {
            theStore.mergeQuotes(cfg.avSymbol, orig, fixed.series)
          })
          mergeRes
        }).getOrElse(Future.successful(QuotesMergeResult(0, 0, Some("Could not obtain AV results"))))
    }).getOrElse(Future.successful(QuotesMergeResult(0, 0, Some("Unknown symbol"))))
  }

  private def migrateFileToDB(implicit ec: ExecutionContext) = {
    val all = QuoteConfig.allConfigsWithCcy
      //     .filter(_.avSymbol == "XAU")
      .map(cfg => {
        val orig = Await.result(QuotesFileStore.readQuotes(cfg.avSymbol), infDur)
        theStore.readQuotes(cfg.avSymbol).flatMap(actual => {
          inFlight += cfg.avSymbol -> 1
          logger.info(s"Merging quotes for ${cfg.avSymbol}. In-flight: (${inFlight.size}) ${inFlight.keys.mkString(",")}")
          theStore.mergeQuotes(cfg.avSymbol, orig, actual).map(x => {
            inFlight.remove(cfg.avSymbol)
            logger.info(s"Merging complete for ${cfg.avSymbol}. In-flight: (${inFlight.size}) ${inFlight.keys.mkString(",")}")
          })

        })
      })
    Future.sequence(all)
  }

  private def downloadFromAlphaVantage(forceDownload: Boolean) = {
    def allCcys = QuoteConfig.allCcys

    allCcys.foreach(ccy => {
      val outFile = s"db/av/$ccy.csv"

      val cmd = s"""wget -O $outFile https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=$ccy&to_symbol=USD&outputsize=full&datatype=csv&apikey=$apikey"""

      goGetIt(outFile, cmd, stdoutResult = false, forceDownload = forceDownload)

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
    val cmdDaily = if (cfg.assetType == "FX") {
      s"""wget -O $outFile https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=$symbol&to_symbol=USD&outputsize=full&datatype=csv&apikey=$apikey"""
    } else {
      s"""wget -O $outFile https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=$symbol&outputsize=full&datatype=csv&apikey=$apikey"""
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
      val timeToSleep = java.time.Duration.between(Instant.now, lastAlphaVantageDownload).minus(alphaVantageTimeGap)
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

    // Quick and dirty heuristic corruption check (e.g. throttle limit hit)
    //    val size = java.nio.file.Files.size(path)
    //    if (size < 500) {
    //      scala.io.Source.fromFile(outFile).getLines().foreach(println(_))
    //      Files.delete(path)
    //    }
  }


  // Read quotes from sources like av and put it into standard form
  def normaliseTheQuotes(implicit ec: ExecutionContext) = {
    val isoCcys = QuoteConfig.allCcys
    // First sort out all the ISO currencies
    val data: Map[AssetId, SortedColumnMap[LocalDate, Double]] = isoCcys.flatMap(fxCcy => {
      AVStockParser.tryParseSymbol(QuoteConfig(fxCcy, "USD", "USD", "FX")).map(res => {
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

    val reses: Seq[Future[Any]] = QuoteConfig
      .allConfigs
      // .filter(_.avSymbol == "VWRL.LON") // Uncomment here for debugging
      .flatMap(cfg => AVStockParser.tryParseSymbol(cfg))
      .map(res => {
        val cfg = res.config
        val srcCcy = res.sourceCcy.map(_.symbol).getOrElse(cfg.domainCcy)
        val fixed = res.fixupLSE(srcCcy, AssetId(cfg.actualCcy), priceFXConverter)
        theStore.readQuotes(cfg.avSymbol).map(orig => {
          theStore.mergeQuotes(cfg.avSymbol, orig, fixed.series)
        })
      })
    Future.sequence(reses)
  }
}
