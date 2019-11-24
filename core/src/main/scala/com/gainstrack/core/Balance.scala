package com.gainstrack.core

import java.math.MathContext

import spire.math.SafeLong


case class Balance(value:Fraction, ccy:AssetId) {

  def toDTO:Map[String, Any] = Map("ccy" -> ccy.symbol, "value" -> value.toDouble)

  private val errmsg = "Balance can only combine single currency"

  // FIXME: This MathContext is important as it needs to match what beancount can handle
  // toDouble is no good because beancount won't take exp format (and nor will humans)
  // and yet we need precise fractional precision so that postings balance out perfectly
  //override def toString: String = s"${value.toBigDecimal(MathContext.DECIMAL128)} ${ccy.symbol}"
  override def toString: String = s"${value.toDouble} ${ccy.symbol}"

  def +(rhs: Balance): Balance = {
    require(rhs.ccy == this.ccy, errmsg)
    Balance(value + rhs.value, ccy)
  }

  def -(rhs: Balance): Balance = {
    require(rhs.ccy == this.ccy, errmsg)
    Balance(value - rhs.value, ccy)
  }

  def *(rhs: Balance): Balance = {
    require(rhs.ccy == this.ccy, errmsg)
    Balance(value * rhs.value, ccy)
  }

  def /(rhs: Balance): Balance = {
    require(rhs.ccy == this.ccy, errmsg)
    Balance(value / rhs.value, ccy)
  }

  def +(rhs:Fraction): Balance = Balance(value + rhs, ccy)
  def -(rhs:Fraction): Balance = Balance(value - rhs, ccy)
  def *(rhs:Fraction): Balance = Balance(value * rhs, ccy)
  def /(rhs:Fraction): Balance = Balance(value / rhs, ccy)
  def unary_-(): Balance = Balance(-value, ccy)
}
object Balance {
  private val re = raw"(\S+) (\S+)".r
  def apply(value:Fraction, ccy:String):Balance = {
    apply(value.limitDenominatorTo(SafeLong(1000000)), AssetId(ccy))
  }

  def parse(str:String) :Balance = {
    str match {
      case re(value, ccy) => Balance(parseNumber(value), ccy)
    }
  }
}
