package com.gainstrack.core

import net.glorat.cqrs.{AggregateRoot, AggregateRootState, DomainEvent}

class PriceCollector extends AggregateRoot {
  override protected var state: AggregateRootState = PriceState(java.util.UUID.randomUUID(), Map())

  override def id: GUID = getState.id

  override def getState: PriceState = state.asInstanceOf[PriceState]

}

case class PriceState(id:GUID, prices:Map[AssetId, Map[LocalDate, Balance]]) extends AggregateRootState {
  private val implicitPrices = true

  def process(e: Transfer): PriceState = {
    if (e.sourceValue.ccy != e.targetValue.ccy) {
      val price = e.sourceValue / e.targetValue.value
      val newByDate = prices.getOrElse(e.targetValue.ccy, Map()).updated(e.date, price)
      copy(prices = prices.updated(e.targetValue.ccy, newByDate))
    }
    else {
      this
    }
  }

  def process (e: SecurityPurchase):PriceState = {
    val price = e.price
    val newByDate = prices.getOrElse(e.security.ccy,Map()).updated(e.date, price)
    copy(prices = prices.updated(e.security.ccy, newByDate))
  }

  def handle(e: DomainEvent): PriceState = {
    e match {
      case e:Transfer => process(e)
      case e:SecurityPurchase => process(e)
      case _ => this
    }
  }
}