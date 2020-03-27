package com.gainstrack.report

import java.time.Duration

import com.gainstrack.command.AccountCreation
import com.gainstrack.core._

object NetworthReport {
  val networthAccounts : AccountId=>Boolean = _.accountType match {
    case Assets | Liabilities => true;
    case _ => false
  }

  def byAsset(date: LocalDate, baseCcy: AssetId, accountFilter:AccountId=>Boolean = networthAccounts)(accountState: AccountState, balanceState: BalanceState, assetState: AssetState, singleFXConverter: SingleFXConverter) = {
    val nw = balanceState.totalPosition(accountFilter, date)

    val assets = assetState.allAssets.values.toSeq.sortBy(_.asset.symbol)
    val rows = assets.map(assetInfo => {
      val nwAccounts = accountState.mainAccounts.filter(acct => accountFilter(acct.accountId))
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

case class NetworthAssetReportDTO(rows: Seq[AssetReportDTO], columns: Seq[ReportColumn[LocalDate]], total: Seq[AssetReportDTO]) {

  def latestPriceDate: Option[LocalDate] = {
    NetworthAssetReportDTO.latestPriceDateFor(rows)
  }

  def bestPriceDate: Option[LocalDate] = {
    val dts = rows.flatMap(_.priceDate)
    if (dts.length>0) {
      val cutOff = dts.max.minusDays(4)
      val recentDts = dts.filter(_.isAfter(cutOff))
      val bestDt = recentDts.groupBy(identity).maxBy(_._2.size)._1
      Some(bestDt)
    }
    else None
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

    val baseDate = bestPriceDate
    baseDate.map( baseDate => {
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
      NetworthAssetReportDTO(newRows, columns, this.total)
    }).getOrElse(this)
  }
}

object NetworthAssetReportDTO {
  def apply (rows: Seq[AssetReportDTO]) : NetworthAssetReportDTO = {
    NetworthAssetReportDTO(rows, Seq(), Seq(totalFor(rows)))
  }

  private def totalFor(rows: Seq[AssetReportDTO]): AssetReportDTO = {
    AssetReportDTO (
      assetId = AssetId("TOTAL"),
      units = 0,
      value = rows.map(_.value).reduce(_ + _),
      price = 0,
      priceDate = latestPriceDateFor(rows),
      accountNetworth = Seq()
    )
  }

  private def latestPriceDateFor(rows: Seq[AssetReportDTO]): Option[LocalDate] = {
    val dts = rows.flatMap(_.priceDate)
    if (dts.length>0) Some(dts.max) else None
  }


}

object AssetReportDTO {

}

case class AssetAccountDTO(
                                    accountId: AccountId,
                                    units: Fraction
                                  )