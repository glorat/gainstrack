package com.gainstrack.report

import java.time.Duration

import com.gainstrack.core._

object NetworthReport {
  def byAsset(date: LocalDate, baseCcy: AssetId)(accountState: AccountState, balanceState: BalanceState, assetState: AssetState, singleFXConverter: SingleFXConverter) = {
    val nw = networth(date)(balanceState)

    val assets = assetState.allAssets.values.toSeq.sortBy(_.asset.symbol)
    val rows = assets.map(assetInfo => {
      val nwAccounts = accountState.mainAccounts.filter(_.accountId.accountType match {case Assets|Liabilities => true; case _ => false})
      val accountNetworth = nwAccounts.toSeq.flatMap(acct => {
        balanceState.totalPosition(acct.accountId, date).assetBalance.get(assetInfo.asset).map( units => {
          AssetAccountDTO(acct.accountId, units)
        })
      })

      AssetReportDTO(
        assetId = assetInfo.asset,
        units = nw.getBalance(assetInfo.asset).number,
        value = nw.getBalance(assetInfo.asset).convertTo(baseCcy, singleFXConverter, date).number,
        price = singleFXConverter.getFX(assetInfo.asset, baseCcy, date).getOrElse(0.0),
        priceDate = singleFXConverter.latestDate(assetInfo.asset, date),
        accountNetworth = accountNetworth
      )
    })

    NetworthAssetReportDTO(rows)
  }

  def networth(date: LocalDate)(balanceState: BalanceState): PositionSet = {
    // Note that it is plus since liabilties are held in negative
    balanceState.totalPosition("Assets", date) + balanceState.totalPosition("Liabilities", date)
  }
}

case class AssetReportDTO(
                               assetId: AssetId,
                               units: Fraction,
                               value: Fraction, // in base currency
                               price: Double,
                               priceDate: Option[LocalDate],
                               accountNetworth: Seq[AssetAccountDTO] = Seq(),
                               priceMoves: Map[String, Double] = Map()
                             )

case class ReportColumn[T] (
               name: String,
               label: String,
               value: T,
               tag: String
               )

case class NetworthAssetReportDTO(rows: Seq[AssetReportDTO], columns: Seq[ReportColumn[LocalDate]] = Seq()) {
  def total: AssetReportDTO = {
    AssetReportDTO (
      assetId = AssetId("TOTAL"),
      units = 0,
      value = rows.map(_.value).reduce(_ + _),
      price = 0,
      priceDate = latestPriceDate,
      accountNetworth = Seq()
    )
  }

  def latestPriceDate: Option[LocalDate] = {
    val dts = rows.flatMap(_.priceDate)
      if (dts.length>0) Some(dts.max) else None
  }

  private def priceMoveColumns(baseDate: LocalDate) = {

    val dates = Seq(
      baseDate.minusDays(1),
      baseDate.minusWeeks(1),
      baseDate.minusMonths(1),
      baseDate.minusMonths(3),
      baseDate.minusYears(1),
      baseDate.withDayOfYear(1))
    val descs = Seq("1d", "1w", "1m", "3m", "1y", "YTD")
    dates.zip(descs).map(x => ReportColumn[LocalDate](x._2, x._2, x._1, "priceMove"))
  }

  def withPriceMoves(baseCcy:AssetId, singleFXConverter: SingleFXConverter): NetworthAssetReportDTO = {

    val baseDate = latestPriceDate
    latestPriceDate.map( baseDate => {
      val columns = priceMoveColumns(baseDate)
      val newRows = rows.map(row => {
        val baseFx = singleFXConverter.getFX(row.assetId, baseCcy, baseDate).getOrElse(0.0)
        val moves = columns.map(col => {
          val fx = singleFXConverter.getFX(row.assetId, baseCcy, col.value).getOrElse(0.0)
          val change = if(fx != 0.0) (baseFx-fx)/fx else 0.0
          col.name -> change
        }).toMap

        row.copy(priceMoves = moves)
      })
      NetworthAssetReportDTO(newRows, columns)
    }).getOrElse(this)
  }
}


object AssetReportDTO {

}

case class AssetAccountDTO(
                                    accountId: AccountId,
                                    units: Fraction
                                  )