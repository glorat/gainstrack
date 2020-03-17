package com.gainstrack.report

import com.gainstrack.core._

object NetworthReport {
  def byAsset(date: LocalDate, baseCcy:AssetId) (balanceState: BalanceState, assetState: AssetState, singleFXConverter: SingleFXConverter) = {
    val nw = networth(date) (balanceState)

    val assets = assetState.allAssets.values.toSeq.sortBy(_.asset.symbol)
    assets.map(assetInfo => {
      NetworthByAssetDTO(
        assetId = assetInfo.asset,
        units = nw.getBalance(assetInfo.asset).number,
        value = nw.getBalance(assetInfo.asset).convertTo(baseCcy, singleFXConverter, date).number,
        fx = singleFXConverter.getFX(assetInfo.asset, baseCcy, date).getOrElse(0.0),
        fxDate = singleFXConverter.latestDate(assetInfo.asset, date)
      )
    })

  }

  def networth(date: LocalDate) (balanceState: BalanceState): PositionSet = {
    balanceState.totalPosition("Assets", date) - balanceState.totalPosition("Liabilities", date)
  }
}

case class NetworthByAssetDTO(
                             assetId: AssetId,
                             units: Fraction,
                             value: Fraction, // in base currency
                             fx: Double,
                             fxDate: Option[LocalDate]
                             )