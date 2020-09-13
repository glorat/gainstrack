package com.gainstrack.quotes.av

import java.io.FileNotFoundException
import java.time.LocalDate

import com.gainstrack.core._
import org.slf4j.LoggerFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.jdbc.MySQLProfile.api._

import scala.collection.immutable.SortedMap
import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Failure, Success}

object QuotesFileStore extends QuoteStore {
  val logger =  LoggerFactory.getLogger(getClass)

  val db = Database.forConfig("quotesdb")

  def readQuotes(symbol: String)(implicit ec: ExecutionContext): Future[SortedMap[LocalDate, Double]] = {
    try {
      val src = scala.io.Source.fromFile(s"db/quotes/${symbol}.csv")
      val lines = src.getLines()
      val builder = SortedMap.newBuilder[LocalDate, Double]
      lines.foreach(line => {
        val bits = line.split(",").map(_.trim)
        builder += (parseDate(bits(0)) -> bits(1).toDouble)
      })

      Future.successful(builder.result)
    }
    catch {
      case _: FileNotFoundException => Future.successful(SortedMap())
    }
  }

  def mergeQuotes(symbol: String, orig: SortedMap[LocalDate, Double], actual: SortedMap[LocalDate, Double])(implicit ec: ExecutionContext): Future[QuotesMergeResult] = {
    // Merge in
    var toUpdate = orig
    var updateCount = 0
    var insertCount = 0
    actual.foreach(x => {
      // FIXME: double comparison is not accurate
      if (orig.get(x._1).map(_ != x._2).getOrElse(true)) {
        logger.info(s"${symbol} ${x._1} updated from ${orig(x._1)} to ${x._2}")
        // Value exists and is different
        toUpdate = toUpdate.updated(x._1, x._2)
        updateCount += 1
        // TODO: Also centrally log all historic changes for audit
      } else {
        insertCount += 1 // even if unchanged since we always do a full rewrite
      }
    })

    // Write to file
    writeQuotes(symbol, toUpdate).map( _ => {
      QuotesMergeResult(inserts = insertCount, updates = updateCount, error = None)
    })


  }

  private def writeQuotes(symbol:String, series: SortedMap[LocalDate, Double])(implicit ec: ExecutionContext): Future[Any] = {
    import java.io._
    val pw = new PrintWriter(new File(s"db/quotes/${symbol}.csv" ))
    series.foreach(x => pw.println(s"${x._1},${x._2}"))
    pw.close
    Future.successful()
  }

}
