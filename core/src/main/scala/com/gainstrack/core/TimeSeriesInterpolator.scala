package com.gainstrack.core

import java.time.temporal.ChronoUnit

import spire.math.Fractional

import scala.collection.SortedMap


class TimeSeriesInterpolator {
  import TimeSeriesInterpolator._


  def getValue[FROM,N](timeSeries:SortedMap[LocalDate,FROM], date:LocalDate)(implicit interpolator:Interpolator[FROM,N]) : Option[N] = {
    val nearest = getNearest(timeSeries,date)
    interpolator(nearest, date)
  }

  def interpValue[N:Fractional](timeSeries:SortedMap[LocalDate,N], date:LocalDate) : Option[Double] = {
    getValue(timeSeries, date)(linear)
  }

  def getNearest[N](timeSeries:SortedMap[LocalDate,N], date:LocalDate) : InterpolationOption[N] = {
    if (timeSeries.isEmpty) {
      Empty()
    }
    else if (timeSeries.contains(date)) {
      Exact(timeSeries(date))
    }
    else {
      val series = timeSeries.toIndexedSeq
      val idx:Int = series.indexWhere(x => x._1.isAfter(date) )
      if (idx < 0) {
        // Then all dates are before
        ExtrapolateHigh(series.last._2)
      }
      else {
        val split = series.splitAt(idx)
        if (split._1.isEmpty) {
          ExtrapolateLow(split._2.head._2)
        }
        else {
          Interpolate(split._1.last, split._2.head)
        }
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

  def linear[N:Fractional]: Interpolator[N,Double] = (nearest, date) => {
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