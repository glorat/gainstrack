package com.gainstrack

package object core {
  type Fraction = spire.math.Rational
  type LocalDate = java.time.LocalDate
  type ZonedDateTime = java.time.ZonedDateTime
  type GUID = net.glorat.cqrs.GUID
  type AccountId = String

  def MinDate : LocalDate = java.time.LocalDate.MIN
  def now(): ZonedDateTime = java.time.ZonedDateTime.now()
  def parseDate(str:String):LocalDate = java.time.LocalDate.parse(str) // TODO: yyyy-mm-dd
  def parseNumber(str:String): Fraction = spire.math.Rational(BigDecimal(str))
  def zeroFraction:Fraction = spire.math.Rational.zero

  implicit def stringToBalance(str:String) = Balance.parse(str)

  implicit val localDateOrdering: Ordering[LocalDate] = new Ordering[LocalDate] {
    def compare(x: LocalDate, y: LocalDate): Int = x compareTo y
  }
}
