package com.gainstrack.quotes.av

import org.slf4j.LoggerFactory

import scala.concurrent.{Await, ExecutionContext, Future}

object QuotesMigrator {
  val logger = LoggerFactory.getLogger(getClass)

  private val infDur = scala.concurrent.duration.Duration.Inf
  private val inFlight = scala.collection.concurrent.TrieMap[String, Int]()

  def migrateFileToDB(fromDb:QuoteStore, toDb:QuoteStore)(implicit ec: ExecutionContext) = {

    val all = QuoteConfig.allConfigsWithCcy
      //     .filter(_.avSymbol == "XAU")
      .map(cfg => {
        val orig = Await.result(fromDb.readQuotes(cfg.avSymbol), infDur)
        fromDb.readQuotes(cfg.avSymbol).flatMap(actual => {
          inFlight += cfg.avSymbol -> 1
          logger.info(s"Merging quotes for ${cfg.avSymbol}. In-flight: (${inFlight.size}) ${inFlight.keys.mkString(",")}")
          toDb.mergeQuotes(cfg.avSymbol, orig, actual).map(x => {
            inFlight.remove(cfg.avSymbol)
            logger.info(s"Merging complete for ${cfg.avSymbol}. In-flight: (${inFlight.size}) ${inFlight.keys.mkString(",")}")
          })

        })
      })
    Future.sequence(all)
  }

  def main(args: Array[String]): Unit = {
    implicit val ec:ExecutionContext = ExecutionContext.global
    migrateFileToDB(QuotesDb, QuotesFileStore)
  }
}
