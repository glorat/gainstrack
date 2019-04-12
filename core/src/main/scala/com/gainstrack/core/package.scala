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
  def zeroFraction:Fraction = spire.math.Rational.zero
}
