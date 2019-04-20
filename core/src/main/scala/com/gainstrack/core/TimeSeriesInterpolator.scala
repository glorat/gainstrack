package com.gainstrack.core

import java.time.Period
import java.time.temporal.ChronoUnit

import scala.collection.SortedMap
import scala.math.ScalaNumber


class TimeSeriesInterpolator[V<:ScalaNumber] {
  sealed trait InterpolationOption
  case class Empty() extends InterpolationOption
  case class Exact(value:V) extends InterpolationOption
  case class Extrapolate(value:V) extends InterpolationOption
  case class Interpolate(before:(LocalDate,V), after:(LocalDate,V)) extends InterpolationOption

  def getValue(timeSeries:SortedMap[LocalDate,V], date:LocalDate) : Option[Double] = {
    val nearest = getNearest(timeSeries,date)
    nearest match {
      case _ :Empty => None
      case e:Exact => Some(e.value.doubleValue())
      case e:Extrapolate => Some(e.value.doubleValue())
      case e:Interpolate => {
        // Linear interpolation
        val all = ChronoUnit.DAYS.between(e.before._1, e.after._1)
        val n = ChronoUnit.DAYS.between(e.before._1, date)
        val ratio = n.toDouble / all.toDouble
        val diff = e.after._2.doubleValue() - e.before._2.doubleValue()
        val ret = (diff*ratio) + e.before._2.doubleValue()
        Some(ret)
      }
      case _ => None
    }
  }

  def getNearest(timeSeries:SortedMap[LocalDate,V], date:LocalDate) : InterpolationOption = {
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
        Extrapolate(timeSeries.last._2)
      }
      else {
        val split = timeSeries.splitAt(idx)
        if (split._1.isEmpty) {
          Extrapolate(split._2.head._2)
        }
        else {
          Interpolate(split._1.last, split._2.head)
        }
      }

    }
  }
}

object TimeSeriesInterpolator {
  def from[V<:ScalaNumber](timeSeries:SortedMap[LocalDate,V]) :TimeSeriesInterpolator[V] = {
    new TimeSeriesInterpolator[V]
  }
}