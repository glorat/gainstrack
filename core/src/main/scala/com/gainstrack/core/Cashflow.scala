package com.gainstrack.core

import java.time.temporal.ChronoUnit

case class Cashflow(date:LocalDate, value:Balance, source:AccountId, convertedValue:Option[Balance]=None) {
  def pv(baseDate:LocalDate, discountRate:Double) = {
    val days = ChronoUnit.DAYS.between(baseDate, date)
    val dcf = days/365.0 // Using Act365 for simplicity
    val cfpv = convertedValue.get.value.toDouble/Math.pow(1+discountRate, dcf)
    cfpv
  }

  def pv01(baseDate:LocalDate, rate:Double):Double = {
    val days = ChronoUnit.DAYS.between(baseDate, date)
    val dcf = days/365.0 // Using Act365 for simplicity
    val amount = convertedValue.get.value.toDouble

    if (dcf == 0)  0
    else if (-1 < rate)  -dcf * amount / Math.pow(1 + rate, dcf + 1)
    else if (rate < -1)  0 // FIXME: ???
    else  0
  }
}

object Cashflow {
  def apply(dtStr:String, valueStr:String, source:AccountId) :Cashflow = Cashflow(parseDate(dtStr), Balance.parse(valueStr), source)
}

case class CashflowTable(cashflows:Seq[Cashflow]) {
  val sorted = cashflows.sortBy(_.date)
  def npv(discountRate:Double):Double = {
    require(sorted.length>0)
    val baseDate = sorted.head.date
    val npv:Double = sorted.foldLeft(0.0)((pv, cf) => {
      val cfpv = cf.pv(baseDate, discountRate)
      pv + cfpv
    })

    npv
  }

  def irr : Double = {
    require(cashflows.exists(_.convertedValue.get.ccy != cashflows.head.convertedValue.get.ccy) == false, "IRR calc requires all cashflows to have same ccy")
    newtonRaphson(r => npv(r), r=>delta(r), 0.01, 0.000001, 25)
  }

  private def delta(discountRate:Double):Double = {
    val baseDate = sorted.head.date

    sorted.foldLeft(0.0)((delta,cf) => {
      delta + cf.pv01(baseDate, discountRate)
    })
  }


  private def newtonRaphson(f: Double => Double, d: Double => Double, xk: Double, tolerance:Double, maxIter:Int): Double = {
    val x = xk - f(xk)/d(xk)
    val y = f(x) + d(x) * (x - xk)
    if (maxIter<=0 || Math.abs(y) < tolerance) {
      // println(s"Newton Raphson resolved to ${y} with ${maxIter} iterations remaining")
      xk
    } // Resolved
    else newtonRaphson(f, d, x, tolerance, maxIter-1) // Not resolved, run next iteration
  }

}