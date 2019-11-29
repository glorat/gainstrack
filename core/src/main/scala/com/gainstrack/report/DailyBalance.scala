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
                        conversionStrategy:String,
                        accountFilter:(AccountCreation=>Boolean) = _=>true
                       ):PositionSet = {
    val acctState = origAcctState.withInterpolatedAccounts
    val accounts = acctState.accounts
    val thisCcy = acctState.accountMap.get(accountId).map(_.key.assetId).getOrElse(origAcctState.baseCurrency)

    // This next line is slow in profiler and needs optimising
    //val children: Set[AccountId] = accounts.filter(_.accountId.parentAccountId.getOrElse(AccountId(":na:")) == accountId).map(_.accountId)
    // This is faster but out of date
    //val children = acctState.childrenMap.get(accountId).getOrElse(Seq())
    // This needs profiling
    val children = accounts
      //.map(_.accountId)
      .filter(_.accountId.isSubAccountOf(accountId))
      .filter(accountFilter)
      .map(_.accountId)

    // This can be extracted out to a strategy
    val acctToPositionSet: (AccountId => PositionSet) = conversionStrategy match {
      case "" | "parent" =>  acct => {
        balanceState.getPosition(acct, date, thisCcy, assetChainMap(acct), priceState)
      }
      case "units" => acct =>
        // Tailing the chain means we stay at the leaf currency
        balanceState.getPosition(acct, date, AssetId("NOVALIDUNIT"), assetChainMap(acct).takeRight(1), priceState)
      case "global" => acct =>
        balanceState.getPosition(acct, date, acctState.baseCurrency, assetChainMap(acct), priceState)
      case ccy:String => acct =>
        balanceState.getPosition(acct, date, AssetId(ccy), assetChainMap(acct), priceState)
    }

    val positions = children.foldLeft(PositionSet())(_ + acctToPositionSet(_))

    positions
  }

}
