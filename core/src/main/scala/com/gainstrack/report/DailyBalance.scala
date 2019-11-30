package com.gainstrack.report

import java.time.{YearMonth, ZoneOffset}

import com.gainstrack.command.AccountCreation
import com.gainstrack.core._

case class DailyBalance(balanceState: BalanceState, date: LocalDate = MaxDate) {

  def monthlySeries(accountId: AccountId, conversionStrategy: String, endDate: LocalDate, acctState: AccountState, priceState: PriceState, assetChainMap: AssetChainMap) = {
    val startDate = acctState.accounts
      .filter(a => accountId == a.accountId || a.accountId.isSubAccountOf(accountId))
      .map(_.date)
      .min
    val startMonth = YearMonth.from(startDate)
    val end = YearMonth.from(endDate).plusMonths(1)
    val it = Iterator.iterate(startMonth)(_.plusMonths(1)).takeWhile(!_.isAfter(end))
    val dates = (for (ym <- it) yield ym.atDay(1)).map(x=>x).toVector
    val values = dates.map(date => this.convertedPosition(accountId, acctState, priceState, assetChainMap, date, conversionStrategy))
    val ccys = values.flatMap(_.assetBalance.keySet).toSet
    val allSeries = ccys.map(ccy => {
      val xy = dates.zip(values.map(_.assetBalance(ccy))).map(x => ApexTimeSeriesEntry(x._1.toString, x._2.toDouble))
      //ApexSeries(ccy.symbol, values.map(_.assetBalance(ccy)))
      ApexSeries(ccy.symbol, xy)
    }).toSeq

    ApexOptions(allSeries)

  }

  def totalPosition(accountId:AccountId) : PositionSet = {
    val keys = balanceState.balances.keys.toSeq.filter(_.isSubAccountOf(accountId))
    keys.foldLeft(PositionSet())((ps,account) => {
      val balOpt = balanceState.getBalanceOpt(account, date)
      balOpt.map(ps + _).getOrElse(ps)
    })
  }

  def positionOfAssets(assets:Set[AssetId], origAcctState:AccountState, priceState: PriceState, assetChainMap: AssetChainMap, date:LocalDate,
                         conversionStrategy:String = "global") = {
    origAcctState.withAsset(assets).foldLeft(PositionSet()) ((ps, account) => {
      val value = this.convertedPosition(account.accountId, origAcctState, priceState, assetChainMap, date, conversionStrategy)
      ps + value
    })
  }

  def convertedPosition(accountId:AccountId,
                        origAcctState:AccountState,
                        priceState: PriceState,
                        assetChainMap: AssetChainMap,
                        date:LocalDate,
                        conversionStrategy:String
                       ):PositionSet = {
    val acctState = origAcctState.withInterpolatedAccounts
    val accounts = acctState.accounts
    val thisCcy = acctState.accountMap.get(accountId).map(_.key.assetId).getOrElse(origAcctState.baseCurrency)

    val acctToPosition: (AccountId=>PositionSet) = balanceState.getBalanceOpt(_, date).map(PositionSet() + _).getOrElse(PositionSet())
    val converter = new BalanceConversion(conversionStrategy, thisCcy, acctToPosition, date)(acctState, priceState, assetChainMap)
    converter.convertTotal(accountId)
  }

}
