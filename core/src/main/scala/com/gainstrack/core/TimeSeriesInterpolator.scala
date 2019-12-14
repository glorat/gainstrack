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

  def getNearest(timeSeries:SortedMap[LocalDate,Fraction], date:LocalDate) : InterpolationOption = {
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
  sealed trait InterpolationOption
  case class Empty() extends InterpolationOption
  case class Exact(value:Fraction) extends InterpolationOption
  case class ExtrapolateLow(value:Fraction) extends InterpolationOption
  case class ExtrapolateHigh(value:Fraction) extends InterpolationOption
  case class Interpolate(before:(LocalDate,Fraction), after:(LocalDate,Fraction)) extends InterpolationOption


  type Interpolator[N] = ( (InterpolationOption, LocalDate) => Option[N])
  val linear : Interpolator[Double] = (nearest,date) => {
    nearest match {
      case _ :Empty => None
      case e:Exact => Some(e.value.toDouble)
      case e:ExtrapolateLow => Some(e.value.toDouble)
      case e:ExtrapolateHigh => Some(e.value.toDouble)
      case e:Interpolate => {
        // Linear interpolation
        val all : Double = ChronoUnit.DAYS.between(e.before._1, e.after._1)
        val n : Double= ChronoUnit.DAYS.between(e.before._1, date)
        val ratio = n/all
        val diff:Double = (e.after._2 - e.before._2).toDouble
        val ret = (diff*ratio) + e.before._2.doubleValue()
        Some(ret)
      }
      case _ => None
    }
  }

  val step : Interpolator[Fraction] = (nearest,date) => {
    nearest match {
      case _ :Empty => None
      case e:Exact => Some(e.value)
      case e: ExtrapolateLow => Some(zeroFraction)
      case e:ExtrapolateHigh=> Some(e.value)
      case e:Interpolate => Some(e.before._2)
      case _ => None
    }
  }


  def from(timeSeries:SortedMap[LocalDate,Fraction]) :TimeSeriesInterpolator = {
    new TimeSeriesInterpolator
  }
}