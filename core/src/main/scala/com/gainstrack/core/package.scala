package com.gainstrack

import java.time.LocalDate

package object core {
  import scala.language.implicitConversions

  type Fraction = scala.math.BigDecimal
  type LocalDate = java.time.LocalDate
  type ZonedDateTime = java.time.ZonedDateTime
  type GUID = net.glorat.cqrs.GUID

  def MinDate : LocalDate = java.time.LocalDate.MIN
  def MaxDate : LocalDate = java.time.LocalDate.MAX
  def now(): ZonedDateTime = java.time.ZonedDateTime.now()
  // FIXME: Centralising this dangerous function here because there is
  // clearly a timezone issue
  def today(): LocalDate = LocalDate.now()
  def parseDate(str:String):LocalDate = java.time.LocalDate.parse(str) // TODO: yyyy-mm-dd
  def parseNumber(str:String): Fraction = BigDecimal(str)
  def zeroFraction:Fraction = BigDecimal(0)

  implicit def stringToBalance(str:String): Amount = Amount.parse(str)

  implicit val localDateOrdering: Ordering[LocalDate] = Ordering.fromLessThan(_ isBefore _)
}
