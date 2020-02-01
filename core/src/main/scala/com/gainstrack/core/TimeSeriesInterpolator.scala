package com.gainstrack.core

import java.time.temporal.ChronoUnit

import spire.math.Fractional

import scala.collection.{GenMap, SortedMap}


class TimeSeriesInterpolator {
  import TimeSeriesInterpolator._
  def getValue[FROM,N](timeSeries:SortedColumnMap[LocalDate, FROM], date:LocalDate)(implicit interpolator:Interpolator[FROM,N]) : Option[N] = {
    val nearest = getNearest(timeSeries,date)
    interpolator(nearest, date)
  }

//  def interpValue[N:Fractional](timeSeries:SortedColumnMap[LocalDate, N], date:LocalDate) : Option[Double] = {
//    getValue(timeSeries, date)(linear)
//  }

  def interpValueFraction(timeSeries:SortedColumnMap[LocalDate, Fraction], date:LocalDate) : Option[Double] = {
    getValue(timeSeries, date)(linearFraction)
  }

  def interpValueDouble(timeSeries:SortedColumnMap[LocalDate, Double], date:LocalDate) : Option[Double] = {
    getValue(timeSeries, date)(linearDouble)
  }

  def getNearest[N](timeSeries:SortedColumnMap[LocalDate,N], date:LocalDate) : InterpolationOption[N] = {
    if (timeSeries.isEmpty) {
      Empty()
    }
    else {
      val idx = timeSeries.iota(date)
      if (idx < 0) {
        // Then all dates are before
        ExtrapolateHigh(timeSeries.vs.last)
      }
      else if (timeSeries.ks(idx) == date) {
        Exact(timeSeries.vs(idx))
      }
      else if (idx == 0) {
        ExtrapolateLow(timeSeries.vs(0))
      }
      else {
        Interpolate(timeSeries.ks(idx-1)->timeSeries.vs(idx-1), timeSeries.ks(idx)->timeSeries.vs(idx))
      }

    }
  }
}

object TimeSeriesInterpolator {
  sealed trait InterpolationOption[N]
  case class Empty[N]() extends InterpolationOption[N]
  case class Exact[N](value:N) extends InterpolationOption[N]
  case class ExtrapolateLow[N](value:N) extends InterpolationOption[N]
  case class ExtrapolateHigh[N](value:N) extends InterpolationOption[N]
  case class Interpolate[N](before:(LocalDate,N), after:(LocalDate,N)) extends InterpolationOption[N]


  type Interpolator[FROM,N] = ((InterpolationOption[FROM], LocalDate) => Option[N])

  //   def linear[N:Fractional]: Interpolator[N,Double] = (nearest, date) => {

  def linearFraction: Interpolator[Fraction,Double] = (nearest, date) => {
    type N= Fraction
    import spire.implicits._

    val ret: Option[Double] = nearest match {
      case _: Empty[N] => None
      case e: Exact[N] => {
        Some(e.value.toDouble())
      }
      case e: ExtrapolateLow[N] => Some(e.value.toDouble)
      case e: ExtrapolateHigh[N] => Some(e.value.toDouble)
      case e: Interpolate[N] => {
        // Linear interpolation
        val all: N = Fractional[N].fromLong(ChronoUnit.DAYS.between(e.before._1, e.after._1))
        val n: N = Fractional[N].fromLong(ChronoUnit.DAYS.between(e.before._1, date))
        val ratio: Double = (n / all).toDouble
        val diff: Double = (e.after._2 - e.before._2).toDouble
        val ret: Double = (diff * ratio) + e.before._2.toDouble
        Some(ret)
      }
      case _ => None
    }
    ret
  }

  def linearDouble: Interpolator[Double,Double] = (nearest, date) => {
    type N = Double
    import spire.implicits._

    val ret: Option[Double] = nearest match {
      case _: Empty[N] => None
      case e: Exact[N] => {
        Some(e.value.toDouble())
      }
      case e: ExtrapolateLow[N] => Some(e.value.toDouble)
      case e: ExtrapolateHigh[N] => Some(e.value.toDouble)
      case e: Interpolate[N] => {
        // Linear interpolation
        val all: N = Fractional[N].fromLong(ChronoUnit.DAYS.between(e.before._1, e.after._1))
        val n: N = Fractional[N].fromLong(ChronoUnit.DAYS.between(e.before._1, date))
        val ratio: Double = (n / all).toDouble
        val diff: Double = (e.after._2 - e.before._2).toDouble
        val ret: Double = (diff * ratio) + e.before._2.toDouble
        Some(ret)
      }
      case _ => None
    }
    ret
  }

  val step : Interpolator[Fraction, Fraction] = (nearest,date) => {
    nearest match {
      case _ :Empty[Fraction] => None
      case e:Exact[Fraction] => Some(e.value)
      case e: ExtrapolateLow[Fraction] => Some(zeroFraction)
      case e:ExtrapolateHigh[Fraction]=> Some(e.value)
      case e:Interpolate[Fraction] => Some(e.before._2)
      case _ => None
    }
  }

}