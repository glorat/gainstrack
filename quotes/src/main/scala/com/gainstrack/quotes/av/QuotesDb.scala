package com.gainstrack.quotes.av

import java.time.LocalDate

import com.gainstrack.core._
import org.slf4j.LoggerFactory
import slick.jdbc.MySQLProfile.api._

import scala.collection.immutable.SortedMap
import scala.concurrent.{Await, ExecutionContext, Future}

object QuotesDb extends QuoteStore {
  val logger = LoggerFactory.getLogger(getClass)
  val db = Database.forConfig("quotesdb")
  val quotesTable = TableQuery[Quotes]

  def localDateToIntDate(dt:LocalDate): Int = {
    dt.getYear*10000 + dt.getMonthValue*100 + dt.getDayOfMonth
  }
  def intDateToLocalDate(id:Int): LocalDate = {
    val day = id % 100;
    val month = ((id-day)/100) % 100
    val year = (id - (id%10000))/10000
    java.time.LocalDate.of(year, month, day)
  }

  def readQuotes(symbol: String)(implicit ec: ExecutionContext): Future[SortedMap[LocalDate, Double]] = {
    try {

      val qry = quotesTable.filter(_.symbol === symbol).sortBy(_.date.asc).result
      val fut: Future[Seq[QuoteValue]] = db.run(qry)
      fut.map((rows: Seq[QuoteValue]) => {
        val builder = SortedMap.newBuilder[LocalDate, Double]
        rows.foreach(row => builder += intDateToLocalDate(row.date) ->  row.value)
        builder.result()
      })

    }
    catch {
      case _: Exception => Future.successful(SortedMap())
    }

  }

  def mergeQuotes(symbol: String, orig: SortedMap[LocalDate, Double], actual: SortedMap[LocalDate, Double])(implicit ec: ExecutionContext): Future[QuotesMergeResult] = {

    val toInsert = actual.filter(x => orig.get(x._1).isEmpty)
    val toUpdate = actual.filter(x => orig.get(x._1).map(_ != x._2).getOrElse(false))

    val insertBatches = toInsert.grouped(200).map(
      quotesTable ++= _.map(x => QuoteValue(None, symbol, localDateToIntDate(x._1), x._2, None))
    )
    // val inserts = quotesTable ++= toInsert.map(x => QuoteValue(None, symbol, x._1, x._2, None))

    val q = (sym:ConstColumn[String], dt:ConstColumn[Int]) =>  (for {qt <- quotesTable if (qt.symbol === symbol && qt.date === dt)} yield qt.value)
    val cq = Compiled(q)
    val updates = toUpdate.map(x => {
      logger.info(s"${symbol} ${x._1}: ${orig(x._1)} -> ${x._2} (${x._2 - orig(x._1)})")
      cq(symbol, localDateToIntDate(x._1)).update(x._2)
    } )

    logger.info(s"$symbol to Insert ${toInsert.size} and update ${toUpdate.size} for $symbol")
    val fut = db.run(DBIO.sequence(insertBatches ++ updates)).map(_ => {
      logger.info(s"$symbol upsert complete!")
      QuotesMergeResult(updates = toUpdate.size, inserts = toInsert.size, error = None)
    }).recoverWith{case e:Exception => {
      logger.error(s"$symbol went wrong somehow" + e.toString)
      val res = QuotesMergeResult(updates = toUpdate.size, inserts = toInsert.size, error = Some(e.toString))
      Future.successful(res)
    }}
    fut

  }

}

case class QuoteValue(id: Option[Int], symbol: String, date: Int, value: Double, source: Option[String])

class Quotes(tag: Tag) extends Table[QuoteValue](tag, "quotes") {
  def id = column[Int]("quote_id", O.PrimaryKey, O.AutoInc)

  def symbol = column[String]("quote_symbol", O.Length(45))

  def date = column[Int]("quote_date")

  def value = column[Double]("quote_value")

  def source = column[Option[String]]("quote_source", O.Length(45))

  def * = (id.?, symbol, date, value, source) .<> (QuoteValue.tupled, QuoteValue.unapply)
}