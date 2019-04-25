package com.gainstrack.core

import java.time.Period
import java.time.temporal.ChronoUnit

import scala.collection.SortedMap
import scala.math.ScalaNumber


class TimeSeriesInterpolator {
  sealed trait InterpolationOption
  case class Empty() extends InterpolationOption
  case class Exact(value:Fraction) extends InterpolationOption
  case class ExtrapolateLow(value:Fraction) extends InterpolationOption
  case class ExtrapolateHigh(value:Fraction) extends InterpolationOption
  case class Interpolate(before:(LocalDate,Fraction), after:(LocalDate,Fraction)) extends InterpolationOption

  def getValue(timeSeries:SortedMap[LocalDate,Fraction], date:LocalDate) : Option[Fraction] = {
    val nearest = getNearest(timeSeries,date)
    nearest match {
      case _ :Empty => None
      case e:Exact => Some(e.value)
      case e: ExtrapolateLow => Some(zeroFraction)
      case e:ExtrapolateHigh=> Some(e.value)
      case e:Interpolate => Some(e.before._2)
      case _ => None
    }
  }

  def interpValue(timeSeries:SortedMap[LocalDate,Fraction], date:LocalDate) : Option[Fraction] = {
    // FIXME: Apply max denom
    val nearest = getNearest(timeSeries,date)
    nearest match {
      case _ :Empty => None
      case e:Exact => Some(e.value)
      case e:ExtrapolateLow => Some(e.value)
      case e:ExtrapolateHigh => Some(e.value)
      case e:Interpolate => {
        // Linear interpolation
        val all : Fraction = ChronoUnit.DAYS.between(e.before._1, e.after._1)
        val n : Fraction= ChronoUnit.DAYS.between(e.before._1, date)
        val ratio = n/all
        val diff:Fraction = e.after._2 - e.before._2
        val ret = (diff*ratio) + e.before._2.doubleValue()
        Some(ret)
      }
      case _ => None
    }
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
  def from(timeSeries:SortedMap[LocalDate,Fraction]) :TimeSeriesInterpolator = {
    new TimeSeriesInterpolator
  }
}