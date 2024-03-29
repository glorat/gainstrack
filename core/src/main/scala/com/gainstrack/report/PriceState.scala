package com.gainstrack.report

import com.gainstrack.command._
import com.gainstrack.core.TimeSeriesInterpolator.linearDouble
import com.gainstrack.core._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}
import spire.math.SafeLong

import scala.annotation.tailrec
import scala.collection.immutable.SortedMap
import scala.math.BigDecimal.RoundingMode


case class PriceState(ccys: Set[AssetId], prices: Map[AssetPair, SortedMap[LocalDate, Fraction]])
  extends AggregateRootState {

  private val implicitPrices = true

  def priceFxConverter : PriceFXConverter = {
    val fastPrices = prices.view.mapValues(series => SortedColumnMap.from(series.view.mapValues(_.toDouble))).toMap

    new PriceFXConverter(ccys, fastPrices)
  }

  def toFxChainMap(baseCcy:AssetId): Map[AssetId, List[AssetId]] = {
    val graph = this.toGraph
    this.ccys.toSeq.map(ccy => {
      ccy -> Dijkstra.shortestPath(graph, ccy.symbol, baseCcy.symbol)._2.map(a => AssetId(a))
    }).toMap
  }

  def toGraph: Map[String, List[(Double, String)]] = {
    val lookup = this.ccys.map(ccy => {
      val pairs = this.prices.keys.filter(_.fx1 == ccy.symbol)
      ccy.symbol -> pairs.map(pair =>  (1 / this.prices.apply(pair).size.toDouble -> pair.fx2 )).toList
    })
    lookup.toMap
  }

  def toDTO: Seq[TimeSeries] = {
    val keys = prices.keys.toSeq.sortBy(_.str)
    keys.map(key => TimeSeries(
      key.str,
      prices(key).map(_ => key.fx2).toSeq, // All same unit
      prices(key).keys.map(_.toString).toSeq,
      prices(key).values.map(_.toDouble.formatted("%.2f")).toSeq,
      None
    ))
  }

  def toDTOWithQuotes(fxConverter: FXConverter): Seq[TimeSeries] = {
    val keys = prices.keys.toSeq.sortBy(_.str)
    keys.map(key => {
      val dts = prices(key).keys.toSeq
      if (key.str == "GBP/USD") {
        val xxx = 1
      }

      TimeSeries(
        key.str,
        prices(key).map(_ => key.fx2).toSeq, // All same unit
        dts.map(_.toString),
        dts.map(dt => prices(key).apply(dt).toDouble.formatted("%.2f")),
        Some(dts.map(dt => fxConverter.getFX(key.fx1, key.fx2, dt).map(_.formatted("%.2f")).getOrElse("")))
      )
    })
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

    this.withUpdatedSeries(fx1, newByDate)
        .withUpdatedSeries(fx2, new2ByDate)
  }

  def withUpdatedSeries(assetId:AssetPair, series: SortedMap[LocalDate, Fraction]): PriceState = {
    this.copy(ccys = ccys + AssetId(assetId.fx1) + AssetId(assetId.fx1),  prices = prices.updated(assetId, series))
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

class PriceFXConverter(val ccys: Set[AssetId], val prices: Map[AssetPair, SortedColumnMap[LocalDate, Double]]) extends FXConverter {
  private val interp = new TimeSeriesInterpolator

  override def latestDate(fx1: AssetId, fx2: AssetId, date: LocalDate): Option[LocalDate] = {
    prices.get(AssetPair(fx1,fx2)).flatMap(series => {
      series.latestKey(date)
    })
  }

  def getFX(fx1:AssetId, fx2:AssetId, date:LocalDate):Option[Double] = {
    getFX(AssetPair(fx1,fx2), date)
  }

  def getFX(tuple:AssetPair, date:LocalDate):Option[Double] = {
    getFX(tuple, date, linearDouble)
  }

  def getFX(tuple:AssetPair, date:LocalDate, interpMethod: TimeSeriesInterpolator.Interpolator[Double, Double]):Option[Double] = {
    if (tuple.fx1 == tuple.fx2) {
      Some(1)
    }
    else {
      val timeSeries:SortedColumnMap[LocalDate, Double] = prices.getOrElse(tuple, SortedColumnMap())
      val ret:Option[Double] = interp.getValue(timeSeries, date)(interpMethod).map(x => x)
      ret
    }
  }

}

object PriceState {
  def apply() : PriceState = PriceState(Set(),Map())
}

case class AssetPair(str: String) {
  def fx1: String = {
    str.split("/")(0)
  }
  def fx2:String = {
    str.split("/")(1)
  }
  def reverse:AssetPair = AssetPair(fx2, fx1)
}
object AssetPair {
  def apply(fx1:String, fx2:String):AssetPair = AssetPair(AssetId(fx1), AssetId(fx2))
  def apply(fx1:AssetId, fx2: AssetId):AssetPair = AssetPair(fx1.symbol + "/" + fx2.symbol)
}


object Dijkstra {

  type Path[Key] = (Double, List[Key])

  def shortestPath[Key](lookup: Map[Key, List[(Double, Key)]], src: Key, dest: Key): Path[Key] = {
    shortestPathRec[Key](lookup, List((0, List(src))), dest, Set())
  }

  private def shortestPathRec[Key](lookup: Map[Key, List[(Double, Key)]], fringe: List[Path[Key]], dest: Key, visited: Set[Key]): Path[Key] = fringe match {
    case (dist, path) :: fringe_rest => path match {
      case key :: path_rest =>
        if (key == dest) (dist, path.reverse)
        else {
          val paths = lookup(key).flatMap { case (d, key) => if (!visited.contains(key)) List((dist + d, key :: path)) else Nil }
          val sorted_fringe = (paths ++ fringe_rest).sortWith { case ((d1, _), (d2, _)) => d1 < d2 }
          shortestPathRec(lookup, sorted_fringe, dest, visited + key)
        }
      case Nil => ???
    }
    case Nil => (0, List())
  }
//
//  def main(x: Array[String]): Unit = {
//    val lookup = Map(
//      "a" -> List((7.0, "b"), (9.0, "c"), (14.0, "f")),
//      "b" -> List((10.0, "c"), (15.0, "d")),
//      "c" -> List((11.0, "d"), (2.0, "f")),
//      "d" -> List((6.0, "e")),
//      "e" -> List((9.0, "f")),
//      "f" -> Nil
//    )
//    val res = shortestPath[String](lookup,"a", "e")
//    println(res)
//  }
}