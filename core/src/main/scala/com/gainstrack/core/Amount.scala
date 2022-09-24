package com.gainstrack.core

import java.math.MathContext

import com.gainstrack.report.FXConverter
import spire.math.SafeLong


case class Amount(number:Fraction, ccy:AssetId) {
  @deprecated("Call toDTO")
  def toOldDTO:Map[String, Any] = Map("ccy" -> ccy.symbol, "value" -> number.toDouble)

  def toDTO:Map[String, Any] = Map("ccy" -> ccy.symbol, "number" -> number.toDouble)

  private val errmsg = "Balance can only combine single currency"

  // FIXME: This MathContext is important as it needs to match what beancount can handle
  // toDouble is no good because beancount won't take exp format (and nor will humans)
  // and yet we need precise fractional precision so that postings balance out perfectly
  //override def toString: String = s"${value.toBigDecimal(MathContext.DECIMAL128)} ${ccy.symbol}"
  override def toString: String = s"${number.toDouble} ${ccy.symbol}"

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
    apply(value.limitDenominatorTo(SafeLong(1000000)), AssetId(ccy))
  }

  def parse(str:String) :Amount = {
    str match {
      case re(value, ccy) => Amount(parseNumber(value), ccy)
    }
  }
}
