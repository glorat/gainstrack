package com.gainstrack.report

import java.time.{Duration, Instant}

import com.gainstrack.core.TimeSeriesInterpolator.linearDouble
import com.gainstrack.core._

import scala.collection.SortedMap

case class SingleFXConversion(data:Map[AssetId, SortedColumnMap[LocalDate, Double]], baseCcy:AssetId) extends SingleFXConverter {
  private val interp = new TimeSeriesInterpolator

  override def getFX(fx1:AssetId, fx2:AssetId, date: LocalDate): Option[Double] = {
    getFX(fx1, fx2, date, linearDouble)
  }

  def latestDate(fx1: AssetId, fx2: AssetId, date: LocalDate): Option[LocalDate] = {
    // If fx2 !== baseCcy return None?
    val ret = data.get(fx1).flatMap(series => {
      series.latestKey(date)
    })
    ret
  }

  def getFX(fx1:AssetId, fx2:AssetId, date: LocalDate, interpMethod: TimeSeriesInterpolator.Interpolator[Double, Double]): Option[Double] = {
    if (fx1 == fx2) {
      Some(1.0)
    }
    else if (fx2 == baseCcy) {
      data.get(fx1).flatMap ( series =>
        interp.getValue(series, date)(interpMethod)
      )
    }
    else {
      getFX(fx1,baseCcy,date).flatMap(fx1based => getFX(fx2,baseCcy,date).map(fx2based=>{
        fx1based / fx2based
      }))
    }
  }
}

object SingleFXConversion {

  import org.slf4j.Logger
  import org.slf4j.LoggerFactory

  val logger: Logger = LoggerFactory.getLogger(classOf[SingleFXConversion])

  def generate(baseCurrency:AssetId)(priceState: PriceFXConverter, fxChainMap: Map[AssetId, List[AssetId]]) : SingleFXConversion = {
    val before = Instant.now
    val ret = generateFoo(baseCurrency)(priceState, fxChainMap)
    val after = Instant.now

    logger.debug(s"SingleFXConversion took ${Duration.between(before,after).toMillis} ms")
    ret
  }
  def generateFoo(baseCurrency:AssetId)(priceState: PriceFXConverter, fxChainMap: Map[AssetId, List[AssetId]]) : SingleFXConversion = {
    val ccys = priceState.ccys

    val bar:Map[AssetId, SortedColumnMap[LocalDate, Double]] = ccys.flatMap(ccy => {
      if (baseCurrency == ccy) {
        None
      }
      else if (priceState.prices.contains(AssetPair(ccy, baseCurrency))) {
        val series = priceState.prices(AssetPair(ccy, baseCurrency))
        Some(ccy -> SortedColumnMap(series.ks, series.vs.map(_.toDouble)))
      }
      else {
        val ccyChainOpt = fxChainMap.get(ccy)

        ccyChainOpt
          .filter(x => x.length>0 && x.last == baseCurrency) // If we can't convert, we must drop
          .map(ccyChain => {
            require(ccyChain.last == baseCurrency)
            // FIXME: This needs to consider every pair in the chain
            //        val dates = ccyChain.dropRight(1).map(ccy => {
            //          priceState.prices(AssetPair(ccy, prevCcy)).keys.toSet
            //        }).flatten
            // FIXME: Since the above is tricky code, just do the last chain step
            val dates = priceState.prices(AssetPair(ccyChain(0), ccyChain(1))).ks
            val values = dates.map( dt => {
              val converted = (PositionSet() + Amount(1, ccy)).convertViaChain(baseCurrency, ccyChain, priceState, dt)
              converted.getBalance(baseCurrency).number.toDouble
            })
            ccy -> SortedColumnMap(dates, values)
          })
      }
    }).toMap

    SingleFXConversion(bar, baseCurrency)
  }
}

trait SingleFXConverter extends FXConverter {
  def baseCcy: AssetId

  def latestDate(fx1: AssetId, date: LocalDate): Option[LocalDate] = latestDate(fx1, baseCcy, date)
}
