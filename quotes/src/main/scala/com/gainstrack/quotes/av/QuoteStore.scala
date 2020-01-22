package com.gainstrack.quotes.av

import java.io.FileNotFoundException

import com.gainstrack.core._
import org.slf4j.LoggerFactory

import scala.collection.SortedMap

object QuoteStore {
  val logger =  LoggerFactory.getLogger(getClass)

  def readQuotes(symbol: String): SortedMap[LocalDate, Double] = {
    try {
      val src = scala.io.Source.fromFile(s"db/quotes/${symbol}.csv")
      val lines = src.getLines()
      val builder = SortedMap.newBuilder[LocalDate, Double]
      lines.foreach(line => {
        val bits = line.split(",").map(_.trim)
        builder += (parseDate(bits(0)) -> bits(1).toDouble)
      })

      builder.result()
    }
    catch {
      case _: FileNotFoundException => SortedMap()
    }

  }

  def mergeQuotes(symbol:String, series: SortedMap[LocalDate, Double]) = {
    val orig = readQuotes(symbol)

    // Merge in
    var toUpdate = orig
    series.foreach(x => {
      // FIXME: double comparison is not accurate
      if (orig.get(x._1).map(_ != x._2).getOrElse(true)) {
        logger.info(s"${symbol} ${x._1} updated to ${x._2}")
        // Value exists and is different
        toUpdate = toUpdate.updated(x._1, x._2)
      }
    })

    // Write to file
    writeQuotes(symbol, toUpdate)

  }

  private def writeQuotes(symbol:String, series: SortedMap[LocalDate, Double]): Unit = {
    import java.io._
    val pw = new PrintWriter(new File(s"db/quotes/${symbol}.csv" ))
    series.foreach(x => pw.println(s"${x._1},${x._2}"))
    pw.close
  }
}
