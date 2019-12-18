package com.gainstrack.report

import java.time.{Duration, Instant}

import com.gainstrack.core._

import scala.collection.SortedMap

case class SingleFXConversion(data:Map[AssetId, SortedColumnMap[LocalDate, Double]], baseCcy:AssetId) extends SingleFXConverter {
  private val interp = new TimeSeriesInterpolator

  override def getFX(fx1:AssetId, fx2:AssetId, date: LocalDate): Option[Double] = {
    if (fx1 == fx2) {
      Some(1.0)
    }
    else if (!data.isDefinedAt(fx1)) {
      None
    }
    else if (fx2 == baseCcy) {
      interp.getValue(data(fx1), date)(TimeSeriesInterpolator.linear)
    }
    else {
      // s"SingleFXConversion can only convert to base currency ${baseCcy}"
      None
    }
  }
}

object SingleFXConversion {

  import org.slf4j.Logger
  import org.slf4j.LoggerFactory

  val logger: Logger = LoggerFactory.getLogger(classOf[SingleFXConversion])

  def generate(baseCurrency:AssetId)(priceState: PriceFXConverter, assetChainMap: AssetChainMap) : SingleFXConversion = {
    val before = Instant.now
    val ret = generateFoo(baseCurrency)(priceState, assetChainMap)
    val after = Instant.now

    logger.info(s"SingleFXConversion took ${Duration.between(before,after).toMillis} ms")
    ret
  }
  def generateFoo(baseCurrency:AssetId)(priceState: PriceFXConverter, assetChainMap: AssetChainMap) : SingleFXConversion = {
    val before = Instant.now
    val during = Instant.now
    logger.info(s"Priming took ${Duration.between(before,during).toMillis} ms")

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
        val ccyChainOpt = assetChainMap.findFirst(ccy)
        ccyChainOpt
          .filter(_.last == baseCurrency) // If we can't convert, we must drop
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

trait SingleFXConverter extends FXConverter
