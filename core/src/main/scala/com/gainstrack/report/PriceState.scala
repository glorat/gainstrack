package com.gainstrack.report

import com.gainstrack.command._
import com.gainstrack.core._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}
import spire.math.SafeLong

import scala.collection.SortedMap
import scala.math.BigDecimal.RoundingMode


case class PriceState(ccys: Set[AssetId], prices: Map[AssetPair, SortedMap[LocalDate, Fraction]])
  extends AggregateRootState with FXConverter {

  private val implicitPrices = true

  private val interp = TimeSeriesInterpolator.from(SortedMap[LocalDate, Fraction]())

  def toDTO = {
    val keys = prices.keys.toSeq.sortBy(_.str)
    keys.map(key => TimeSeries(
      key.str,
      keys.map(_ => key.fx2), // All same unit
      prices(key).keys.map(_.toString).toSeq,
      prices(key).values.map(_.toDouble.formatted("%.2f")).toSeq,
      None
    ))
  }

  def getFX(fx1:AssetId, fx2:AssetId, date:LocalDate):Option[Double] = {
    getFX(AssetPair(fx1,fx2), date)
  }

  def getFX(tuple:AssetPair, date:LocalDate):Option[Double] = {
    if (tuple.fx1 == tuple.fx2) {
      Some(1)
    }
    else {
      val timeSeries = prices.getOrElse(tuple, SortedMap())
      //println(s"Getting fx for ${tuple} has ${timeSeries.size} entries")

      val ret:Option[Double] = interp.interpValue(timeSeries, date).map(x => x)
      ret
    }
  }


  def process(e: Transfer): PriceState = {
    if (e.sourceValue.ccy != e.targetValue.ccy) {
      val price = e.sourceValue / e.targetValue.number
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

  private def process(e: PriceObservation) : PriceState = {
    this.withNewPrice(e.date, e.price, e.assetId)
  }

  private def withNewPrice(date:LocalDate, price:Amount, tgt:AssetId) : PriceState = {
    require(tgt != price.ccy)
    val fx1 = AssetPair(tgt,price.ccy)
    val fx2 = AssetPair(price.ccy, tgt)
    val newByDate = prices.getOrElse(fx1,SortedMap()).updated(date, price.number)
    val new2ByDate = prices.getOrElse(fx2, SortedMap()).updated(date, 1/price.number)
    val newCcys = this.ccys + price.ccy + tgt
    copy(ccys = newCcys, prices = prices.updated(fx1, newByDate).updated(fx2, new2ByDate))
  }

  def handle(e: DomainEvent): PriceState = {
    e match {
      case e:Transfer => process(e)
      case e:CommandWithAccounts[_] => e.toTransfers.foldLeft(this)(_.process(_))
      case e:SecurityPurchase => process(e)
      case e:UnitTrustBalance => process(e)
      case e:PriceObservation => process(e)
      case _ => this
    }
  }
}

object PriceState {
  def apply() : PriceState = PriceState(Set(),Map())
}

case class AssetPair(str: String) {
  def fx1 = {
    str.split("/")(0)
  }
  def fx2:String = {
    str.split("/")(1)
  }
}
object AssetPair {
  def apply(fx1:String, fx2:String):AssetPair = AssetPair(AssetId(fx1), AssetId(fx2))
  def apply(fx1:AssetId, fx2: AssetId):AssetPair = AssetPair(fx1.symbol + "/" + fx2.symbol)
}
