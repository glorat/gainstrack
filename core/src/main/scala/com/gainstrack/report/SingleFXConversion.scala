package com.gainstrack.report

import com.gainstrack.core._

import scala.collection.SortedMap

case class SingleFXConversion(data:Map[AssetId, SortedMap[LocalDate, Fraction]], baseCcy:AssetId) extends FXConverter {
  private val interp = TimeSeriesInterpolator.from(SortedMap[LocalDate, Fraction]())

  override def getFX(fx1:AssetId, fx2:AssetId, date: LocalDate, maxDenom: Long=1000000): Option[Fraction] = {
    if (!data.isDefinedAt(fx1)) {
      None
    }
    else if (fx2 == baseCcy) {
      interp.interpValue(data(fx1), date)
    }
    else {
      // s"SingleFXConversion can only convert to base currency ${baseCcy}"
      None
    }
  }
}

object SingleFXConversion {
  def generate(baseCurrency:AssetId)(priceState: PriceState, assetChainMap: AssetChainMap) : SingleFXConversion = {
    val ccys = priceState.ccys

    val bar = ccys.flatMap(ccy => {
      if (baseCurrency == ccy) {
        None
      }
      else if (priceState.prices.contains(AssetPair(ccy, baseCurrency))) {
        Some(ccy -> priceState.prices(AssetPair(ccy, baseCurrency)))
      }
      else {
        val ccyChainOpt = assetChainMap.findFirst(ccy)
        ccyChainOpt.map(ccyChain => {
          require(ccyChain.last == baseCurrency)
          // FIXME: This needs to consider every pair in the chain
          //        val dates = ccyChain.dropRight(1).map(ccy => {
          //          priceState.prices(AssetPair(ccy, prevCcy)).keys.toSet
          //        }).flatten
          // FIXME: Since the above is tricky code, just do the last chain step
          val dates = priceState.prices(AssetPair(ccyChain(0), ccyChain(1))).keys

          val series: SortedMap[LocalDate, Fraction] = dates.foldLeft(SortedMap[LocalDate,Fraction] ())((mp, dt) => {
            val converted = (PositionSet()+Amount(1, ccy)).convertViaChain(baseCurrency, ccyChain, priceState, dt)
            mp.updated(dt, converted.getBalance(baseCurrency).number)
          })
          ccy -> series
        })
      }
    }).toMap

    SingleFXConversion(bar, baseCurrency)
  }
}