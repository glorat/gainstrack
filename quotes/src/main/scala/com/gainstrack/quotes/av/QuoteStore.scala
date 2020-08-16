package com.gainstrack.quotes.av

import java.time.LocalDate

import scala.collection.immutable.SortedMap
import scala.concurrent.{ExecutionContext, Future}

trait QuoteStore {
  def readQuotes(symbol: String)(implicit ec: ExecutionContext): Future[SortedMap[LocalDate, Double]]

  def mergeQuotes(symbol: String, orig: SortedMap[LocalDate, Double], actual: SortedMap[LocalDate, Double])(implicit ec: ExecutionContext): Future[QuotesMergeResult]
}

case class QuotesMergeResult(inserts: Int, updates: Int, error:Option[String])
