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

  def convertedPosition(accountId:AccountId, origAcctState:AccountState, priceState: PriceState, date:LocalDate, conversionStrategy:String):PositionSet = {
    val acctState = origAcctState.withInterpolatedAccounts
    val accounts = acctState.accounts
    // This next line is slow in profiler and needs optimising
    //val children: Set[AccountId] = accounts.filter(_.accountId.parentAccountId.getOrElse(AccountId(":na:")) == accountId).map(_.accountId)
    val children = acctState.childrenMap.get(accountId).getOrElse(Seq())
    // This is slow too but might just be scala collections overhead
    val childBalances = children.foldLeft(PositionSet())(_ + convertedPosition(_, acctState, priceState, date, conversionStrategy))
    val positions = balanceState.getBalanceOpt(accountId, date).map(childBalances + _).getOrElse(childBalances)

    // This can be extracted out to a strategy
    val acctToPositionSet: (AccountCreation => PositionSet) = conversionStrategy match {
      case "" | "parent" =>  acct =>
        positions.convertTo(acct.key.assetId, priceState, date)
      case "units" => acct =>
        positions.convertTo(AssetId("NOVALIDUNIT"), priceState, date)
      case ccy:String => acct =>
        positions.convertToOneOf(Seq(AssetId(ccy),acct.key.assetId), priceState, date)
    }

    val converted:PositionSet = acctState.accountMap.get(accountId)
      //.map(acctToTgtCcy)
      //.map(tgtCcy => { positions.convertTo(tgtCcy, priceState, date)})
      .map(acctToPositionSet)
      //.map(res => {println (s"${accountId} has ${res}"); res})
      .getOrElse(positions)
    converted
  }

}
