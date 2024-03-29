package com.gainstrack.report

import java.time.{YearMonth, ZoneOffset}

import com.gainstrack.command.AccountCreation
import com.gainstrack.core._

case class DailyBalance(balanceState: BalanceState) {

  def monthlySeries(accountId: AccountId, conversionStrategy: String, startDate: LocalDate, endDate: LocalDate, acctState: AccountState, assetChainMap: AssetChainMap, singleFXConversion: SingleFXConverter): ApexOptions = {
    val startMonth = YearMonth.from(startDate)
    val end = YearMonth.from(endDate)
    val it = Iterator.iterate(startMonth)(_.plusMonths(1)).takeWhile(!_.isAfter(end))
    val dates = (for (ym <- it) yield ym.atDay(1)).map(x=>x).toVector :+ endDate
    seriesForDates(accountId, conversionStrategy, acctState, assetChainMap, singleFXConversion, dates)
  }

  private def seriesForDates(accountId: AccountId, conversionStrategy: String, acctState: AccountState, assetChainMap: AssetChainMap, singleFXConversion: SingleFXConverter, dates: Vector[LocalDate]) = {
    val values = dates.map(date => this.convertedPosition(accountId, date, conversionStrategy)(acctState = acctState, assetChainMap = assetChainMap, singleFXConversion))
    val ccys = values.flatMap(_.assetBalance.keySet).toSet
    val allSeries = ccys.map(ccy => {
      val xy = dates.zip(values.map(_.assetBalance(ccy))).map(x => ApexTimeSeriesEntry(x._1.toString, x._2.toDouble))
      //ApexSeries(ccy.symbol, values.map(_.assetBalance(ccy)))
      ApexSeries(ccy.symbol, xy)
    }).toSeq

    ApexOptions(allSeries)
  }

  def txSeries(accountId: AccountId, conversionStrategy: String, startDate: LocalDate, endDate: LocalDate, acctState: AccountState, assetChainMap: AssetChainMap, singleFXConversion: SingleFXConverter, transactionState: TransactionState):ApexOptions = {
    val dates = transactionState.txsUnderAccount(accountId).map(_.postDate).toVector
    seriesForDates(accountId, conversionStrategy, acctState, assetChainMap, singleFXConversion, dates)
  }

//  def positionOfAssets(assets:Set[AssetId], origAcctState:AccountState, priceState: PriceFXConverter, assetChainMap: AssetChainMap, date:LocalDate,
//                         conversionStrategy:String = "global")(implicit singleFXConversion: SingleFXConverter) = {
//    origAcctState.withAsset(assets).foldLeft(PositionSet()) ((ps, account) => {
//      val value = this.convertedPosition(account.accountId, date, conversionStrategy)(origAcctState, priceState ,  assetChainMap, singleFXConversion)
//      ps + value
//    })
//  }

  def convertedPosition(accountId: AccountId, date: LocalDate, conversionStrategy: String, accountFilter: AccountCreation => Boolean = _ => true)
                       (implicit acctState: AccountState, assetChainMap: AssetChainMap, singleFXConversion: SingleFXConverter): PositionSet = {
    val interpolatedAccountState = acctState.withInterpolatedAccounts
    val accounts = interpolatedAccountState.accounts
    val thisCcy = interpolatedAccountState.accountMap.get(accountId).map(_.key.assetId).getOrElse(acctState.baseCurrency)

    val acctToPosition: (AccountId=>PositionSet) = balanceState.getBalanceOpt(_, date).map(PositionSet() + _).getOrElse(PositionSet())
    val converter = new BalanceConversion(conversionStrategy, thisCcy, acctToPosition, date)
    converter.convertTotal(accountId, accountFilter)
  }

}
