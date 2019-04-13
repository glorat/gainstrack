package com.gainstrack.core

import spire.math.SafeLong


case class Balance(value:Fraction, ccy:AssetId) {
  private val errmsg = "Balance can only combine single currency"

  override def toString: AccountId = s"${value.toDouble} ${ccy.symbol}"
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
