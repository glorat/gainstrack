package com.gainstrack.report

import com.gainstrack.command.{CommandWithAccounts, SecurityPurchase, Transfer, UnitTrustBalance}
import com.gainstrack.core._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}
import spire.math.SafeLong

import scala.collection.SortedMap

case class PriceState(prices:Map[AssetTuple, SortedMap[LocalDate, Fraction]]) extends AggregateRootState {
  private val implicitPrices = true

  private val interp = TimeSeriesInterpolator.from(SortedMap[LocalDate, Fraction]())

  def getFX(tuple:AssetTuple, date:LocalDate, maxDenom:Long=1000000):Option[Fraction] = {
    if (tuple.fx1 == tuple.fx2) {
      Some(1)
    }
    else {
      val timeSeries = prices.getOrElse(tuple, SortedMap())
      //println(s"Getting fx for ${tuple} has ${timeSeries.size} entries")

      val ret:Option[Fraction] = interp.interpValue(timeSeries, date).map(x => x)
      //println(s"Result: ${ret}")
      ret.map(f => f.limitDenominatorTo(SafeLong(maxDenom)))
    }
  }


  def process(e: Transfer): PriceState = {
    if (e.sourceValue.ccy != e.targetValue.ccy) {
      val price = e.sourceValue / e.targetValue.value
      this.withNewPrice(e.date, price, e.targetValue.ccy)
     }
    else {
      this
    }
  }

  def process (e: SecurityPurchase):PriceState = {
    val price = e.price
    this.withNewPrice(e.date, e.price, e.security.ccy)
  }

  def process(e:UnitTrustBalance) : PriceState = {
    val price = e.price
    this.withNewPrice(e.date, e.price, e.security.ccy)
  }

  private def withNewPrice(date:LocalDate, price:Balance, tgt:AssetId) : PriceState = {
    require(tgt != price.ccy)
    val fx1 = AssetTuple(tgt,price.ccy)
    val fx2 = AssetTuple(price.ccy, tgt)
    val newByDate = prices.getOrElse(fx1,SortedMap()).updated(date, price.value)
    val new2ByDate = prices.getOrElse(fx2, SortedMap()).updated(date, 1/price.value)
    copy(prices = prices.updated(fx1, newByDate).updated(fx2, new2ByDate))
  }

  def handle(e: DomainEvent): PriceState = {
    e match {
      case e:Transfer => process(e)
      case e:CommandWithAccounts[_] => e.toTransfers.foldLeft(this)(_.process(_))
      case e:SecurityPurchase => process(e)
      case e:UnitTrustBalance => process(e)
      case _ => this
    }
  }
}

object PriceState {
  def apply() : PriceState = PriceState(Map())
}

case class AssetTuple(fx1:AssetId, fx2:AssetId)
object AssetTuple {
  def apply(fx1:String, fx2:String):AssetTuple = AssetTuple(AssetId(fx1),AssetId(fx2))
}
