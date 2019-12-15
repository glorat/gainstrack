package com.gainstrack.core

import java.time.temporal.ChronoUnit

import scala.collection.SortedMap


class TimeSeriesInterpolator {
  import TimeSeriesInterpolator._


  def getValue[N](timeSeries:SortedMap[LocalDate,Fraction], date:LocalDate)(implicit interpolator:Interpolator[N]) : Option[N] = {
    val nearest = getNearest(timeSeries,date)
    interpolator(nearest, date)
  }

  def interpValue(timeSeries:SortedMap[LocalDate,Fraction], date:LocalDate) : Option[Double] = {
    getValue(timeSeries, date)(linear)
  }

  def getNearest(timeSeries:SortedMap[LocalDate,Fraction], date:LocalDate) : InterpolationOption[Fraction] = {
    if (timeSeries.isEmpty) {
      Empty()
    }
    else if (timeSeries.contains(date)) {
      Exact(timeSeries(date))
    }
    else {
      val idx:Int = timeSeries.toIndexedSeq.indexWhere(x => x._1.isAfter(date) )
      if (idx < 0) {
        // Then all dates are before
        ExtrapolateHigh(timeSeries.last._2)
      }
      else {
        val split = timeSeries.splitAt(idx)
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


  type Interpolator[N] = ((InterpolationOption[Fraction], LocalDate) => Option[N])
  val linear: Interpolator[Double] = (nearest, date) => {
    val ret: Option[Double] = nearest match {
      case _: Empty[Fraction] => None
      case e: Exact[Fraction] => Some(e.value.toDouble)
      case e: ExtrapolateLow[Fraction] => Some(e.value.toDouble)
      case e: ExtrapolateHigh[Fraction] => Some(e.value.toDouble)
      case e: Interpolate[Fraction] => {
        // Linear interpolation
        val all: Double = ChronoUnit.DAYS.between(e.before._1, e.after._1)
        val n: Double = ChronoUnit.DAYS.between(e.before._1, date)
        val ratio: Double = n / all
        val diff: Double = (e.after._2 - e.before._2).toDouble
        val ret: Double = (diff * ratio) + e.before._2.toDouble
        Some(ret)
      }
      case _ => None
    }
    ret
  }

  val step : Interpolator[Fraction] = (nearest,date) => {
    nearest match {
      case _ :Empty[Fraction] => None
      case e:Exact[Fraction] => Some(e.value)
      case e: ExtrapolateLow[Fraction] => Some(zeroFraction)
      case e:ExtrapolateHigh[Fraction]=> Some(e.value)
      case e:Interpolate[Fraction] => Some(e.before._2)
      case _ => None
    }
  }


  def from(timeSeries:SortedMap[LocalDate,Fraction]) :TimeSeriesInterpolator = {
    new TimeSeriesInterpolator
  }
}