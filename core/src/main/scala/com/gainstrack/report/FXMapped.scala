
package com.gainstrack.report

import java.time.temporal.ChronoUnit

import com.gainstrack.core.TimeSeriesInterpolator.{Empty, Exact, ExtrapolateHigh, ExtrapolateLow, Interpolate, Interpolator}
import com.gainstrack.core.{AssetId, LocalDate}

class FXMapped(mapper:Map[AssetId,AssetId], singleFXConverter: SingleFXConverter) extends SingleFXConverter {
  override def baseCcy: AssetId = singleFXConverter.baseCcy

  override def getFX(fx1: AssetId, fx2: AssetId, date: LocalDate): Option[Double] = {
    val cfx1 = mapper.get(fx1).getOrElse(fx1)
    val cfx2 = mapper.get(fx2).getOrElse(fx2)
    val ret = singleFXConverter.getFX(cfx1, cfx2, date)
    ret
  }

  override def latestDate(fx1: AssetId, fx2: AssetId, date: LocalDate): Option[LocalDate] = {
    val cfx1 = mapper.get(fx1).getOrElse(fx1)
    val cfx2 = mapper.get(fx2).getOrElse(fx2)
    singleFXConverter.latestDate(cfx1, cfx2, date)
  }
}

class FXProxy(mapper:Map[AssetId, AssetId], tradeFx: SingleFXConversion, marketFx: SingleFXConverter) extends SingleFXConverter {
  override def baseCcy: AssetId = marketFx.baseCcy

  override def getFX(fx1: AssetId, fx2: AssetId, date: LocalDate): Option[Double] = {
    mapper.get(fx1).flatMap(proxyTicker => {

      val interpMethod: Interpolator[Double, Double] = (nearest, date) => {
        type N = Double

        val ret: Option[Double] = nearest match {
          case _: Empty[N] => None
          case e: Exact[N] => {
            Some(e.value)
          }
          case e: ExtrapolateLow[N] => Some(e.value.toDouble)
          case e: ExtrapolateHigh[N] => {
            // Extrapolate from market
            val lastDate = tradeFx.data(fx1).ks.last
            val lastTrade = tradeFx.data(fx1).vs.last
            marketFx.getFX(proxyTicker, fx2, lastDate).flatMap(marketBase => {
              marketFx.getFX(proxyTicker, fx2, date).flatMap(marketRef => {
                if (marketBase != 0.0) {
                  val proxyVal = lastTrade * (marketRef / marketBase)
                  Some(proxyVal)
                }
                else {
                  None
                }
              })
            })
          }
          case e: Interpolate[N] => {
            // Linear interpolation
            // TODO: Apply market interp
            val all: Double = ChronoUnit.DAYS.between(e.before._1, e.after._1).toDouble
            val n: Double = ChronoUnit.DAYS.between(e.before._1, date).toDouble
            val ratio: Double = (n / all).toDouble
            val diff: Double = (e.after._2 - e.before._2).toDouble
            val ret: Double = (diff * ratio) + e.before._2.toDouble
            Some(ret)
          }
          case _ => None
        }
        ret
      }

      tradeFx.getFX(fx1, fx2, date, interpMethod)
    })


  }

  override def latestDate(fx1: AssetId, fx2: AssetId, date: LocalDate): Option[LocalDate] = {
    mapper.get(fx1).flatMap(proxyTicker => {
      tradeFx.latestDate(proxyTicker, fx2, date)
    })
  }
}

class FXChain(fxConverters: SingleFXConverter*) extends SingleFXConverter {

  override def baseCcy: AssetId = fxConverters.head.baseCcy

  override def getFX(fx1: AssetId, fx2: AssetId, date: LocalDate): Option[Double] = {
    val x: Option[Double] = None
    fxConverters.foldLeft(x)((soFar, next) => {
      soFar.map(Some(_)).getOrElse(next.getFX(fx1, fx2, date))
    })
  }

  override def latestDate(fx1: AssetId, fx2: AssetId, date: LocalDate): Option[LocalDate] = {
    val x: Option[LocalDate] = None
    fxConverters.foldLeft(x)((soFar, next) => {
      soFar.map(Some(_)).getOrElse(next.latestDate(fx1, fx2, date))
    })
  }
}