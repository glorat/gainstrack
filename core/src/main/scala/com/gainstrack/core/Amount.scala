package com.gainstrack.core

import com.gainstrack.report.FXConverter


case class Amount(number:Fraction, ccy:AssetId) {
  @deprecated("Call toDTO")
  def toOldDTO:Map[String, Any] = Map("ccy" -> ccy.symbol, "value" -> number.toDouble)

  def toDTO:Map[String, Any] = Map("ccy" -> ccy.symbol, "number" -> number.toDouble)

  private val errmsg = "Balance can only combine single currency"

  // beancount won't accept exponential format (and nor will humans), yet we need the
  // full decimal precision so postings still balance. BigDecimal.toString can emit
  // exp notation (e.g. 1E-7); toPlainString keeps it plain so bean-check accepts it.
  override def toString: String = s"${number.bigDecimal.toPlainString} ${ccy.symbol}"

  def convertTo(tgtCcy: AssetId, fxConverter: FXConverter, date:LocalDate): Amount = {
    // Defaulting self if we fail to convert, to be consistent with PositionSet
    fxConverter.getFX(ccy, tgtCcy, date).map(fx => Amount(number*fx, tgtCcy)).getOrElse(this)

  }

  def +(rhs: Amount): Amount = {
    require(rhs.ccy == this.ccy, errmsg)
    Amount(number + rhs.number, ccy)
  }

  def -(rhs: Amount): Amount = {
    require(rhs.ccy == this.ccy, errmsg)
    Amount(number - rhs.number, ccy)
  }

  def *(rhs: Amount): Amount = {
    require(rhs.ccy == this.ccy, errmsg)
    Amount(number * rhs.number, ccy)
  }

  def /(rhs: Amount): Amount = {
    require(rhs.ccy == this.ccy, errmsg)
    Amount(number / rhs.number, ccy)
  }

  def +(rhs:Fraction): Amount = Amount(number + rhs, ccy)
  def -(rhs:Fraction): Amount = Amount(number - rhs, ccy)
  def *(rhs:Fraction): Amount = Amount(number * rhs, ccy)
  def /(rhs:Fraction): Amount = Amount(number / rhs, ccy)
  def unary_- : Amount = Amount(number.unary_-, ccy)
}
object Amount {
  private val re = raw"(\S+) (\S+)".r
  def apply(value:Fraction, ccy:String):Amount = {
    apply(value, AssetId(ccy))
  }

  def parse(str:String) :Amount = {
    str match {
      case re(value, ccy) => Amount(parseNumber(value), ccy)
    }
  }
}
