package com.gainstrack.report

import java.time.{YearMonth, ZoneOffset}

import com.gainstrack.command.AccountCreation
import com.gainstrack.core._

case class ApexTimeSeriesEntry(x:String, y:Double)

case class ApexSeries(name: String, data: Seq[Any])

case class ApexXAxis(categories: Seq[LocalDate], title: ApexTitle)


case class ApexYAxis(title: ApexTitle)

case class ApexTitle(text: String)

case class ApexOptions(series: Seq[ApexSeries], xaxis: Option[ApexXAxis]=None, yaxis: Option[ApexYAxis]=None)

case class DailyBalance(balanceState: BalanceState, date: LocalDate = MaxDate) {

  def monthlySeries(accountId: AccountId, conversionStrategy: String, endDate: LocalDate, acctState: AccountState, priceState: PriceState) = {
    val startDate = acctState.accounts
      .filter(a => accountId == a.accountId || a.accountId.isSubAccountOf(accountId))
      .map(_.date)
      .min
    val startMonth = YearMonth.from(startDate)
    val end = YearMonth.from(endDate).plusMonths(1)
    val it = Iterator.iterate(startMonth)(_.plusMonths(1)).takeWhile(!_.isAfter(end))
    val dates = (for (ym <- it) yield ym.atDay(1)).map(x=>x).toVector
    val values = dates.map(date => this.convertedPosition(accountId, acctState, priceState, date, conversionStrategy))
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

  def positionOfAssets(assets:Set[AssetId], origAcctState:AccountState, priceState: PriceState, date:LocalDate,
                         conversionStrategy:String = "global") = {
    origAcctState.withAsset(assets).foldLeft(PositionSet()) ((ps, account) => {
      val value = this.convertedPosition(account.accountId, origAcctState, priceState, date, conversionStrategy)
      ps + value
    })
  }

  def convertedPosition(accountId:AccountId, origAcctState:AccountState, priceState: PriceState, date:LocalDate, conversionStrategy:String):PositionSet = {
    val acctState = origAcctState.withInterpolatedAccounts
    val accounts = acctState.accounts
    val thisCcy = acctState.accountMap.get(accountId).map(_.key.assetId).getOrElse(origAcctState.baseCurrency)

    // This next line is slow in profiler and needs optimising
    //val children: Set[AccountId] = accounts.filter(_.accountId.parentAccountId.getOrElse(AccountId(":na:")) == accountId).map(_.accountId)
    // This is faster but out of date
    //val children = acctState.childrenMap.get(accountId).getOrElse(Seq())
    // This needs profiling
    val children = accounts.map(_.accountId).filter(_.isSubAccountOf(accountId))

    // This can be extracted out to a strategy
    val acctToPositionSet: (AccountId => PositionSet) = conversionStrategy match {
      case "" | "parent" =>  acct => {
        balanceState.getPosition(acct, date, thisCcy, acctState.assetChainMap(acct), priceState)
      }
      case "units" => acct =>
        // Tailing the chain means we stay at the leaf currency
        balanceState.getPosition(acct, date, AssetId("NOVALIDUNIT"), acctState.assetChainMap(acct).tail, priceState)
      case "global" => acct =>
        balanceState.getPosition(acct, date, acctState.baseCurrency, acctState.assetChainMap(acct), priceState)
      case ccy:String => acct =>
        balanceState.getPosition(acct, date, AssetId(ccy), acctState.assetChainMap(acct), priceState)
    }

    val positions = children.foldLeft(PositionSet())(_ + acctToPositionSet(_))

    positions
  }

}
