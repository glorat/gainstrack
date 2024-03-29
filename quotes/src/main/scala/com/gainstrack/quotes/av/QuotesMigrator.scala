package com.gainstrack.quotes.av

import org.slf4j.LoggerFactory

import scala.concurrent.{Await, ExecutionContext, Future}

object QuotesMigrator {
  val logger = LoggerFactory.getLogger(getClass)

  private val infDur = scala.concurrent.duration.Duration.Inf
  private val inFlight = scala.collection.concurrent.TrieMap[String, Int]()

  def migrateFileToDB(fromDb:QuoteStore, toDb:QuoteStore)(implicit ec: ExecutionContext) = {
    val db = new QuoteConfigDB()
    val all = db.allConfigsWithCcy
      //     .filter(_.avSymbol == "XAU")
      .map(cfg => {
        val orig = Await.result(fromDb.readQuotes(cfg.id), infDur)
        fromDb.readQuotes(cfg.id).flatMap(actual => {
          inFlight += cfg.id -> 1
          logger.info(s"Merging quotes for ${cfg.id}. In-flight: (${inFlight.size}) ${inFlight.keys.mkString(",")}")
          toDb.mergeQuotes(cfg.id, orig, actual).map(x => {
            inFlight.remove(cfg.id)
            logger.info(s"Merging complete for ${cfg.id}. In-flight: (${inFlight.size}) ${inFlight.keys.mkString(",")}")
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
