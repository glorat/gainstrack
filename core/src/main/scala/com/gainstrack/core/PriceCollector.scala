package com.gainstrack.core

import java.time.Period

import net.glorat.cqrs.{AggregateRoot, AggregateRootState, DomainEvent}
import spire.math.SafeLong

import scala.collection.SortedMap
import scala.math.ScalaNumber

class PriceCollector extends AggregateRoot {
  override protected var state: AggregateRootState = PriceState(java.util.UUID.randomUUID(), Map())

  override def id: GUID = getState.id

  override def getState: PriceState = state.asInstanceOf[PriceState]

}

case class AssetTuple(fx1:AssetId, fx2:AssetId)
object AssetTuple {
  def apply(fx1:String, fx2:String):AssetTuple = AssetTuple(AssetId(fx1),AssetId(fx2))
}

case class PriceState(id:GUID, prices:Map[AssetTuple, SortedMap[LocalDate, Fraction]]) extends AggregateRootState {
  private val implicitPrices = true

  private val interp = TimeSeriesInterpolator.from(SortedMap[LocalDate, Fraction]())

  def getFX(tuple:AssetTuple, date:LocalDate, maxDenom:Long=1000000):Option[Fraction] = {
    val timeSeries = prices.getOrElse(tuple, SortedMap())
    val ret:Option[Fraction] = interp.interpValue(timeSeries, date).map(x => x)

    ret.map(f => f.limitDenominatorTo(SafeLong(maxDenom)))
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
      case e:SecurityPurchase => process(e)
      case e:UnitTrustBalance => process(e)
      case _ => this
    }
  }
}