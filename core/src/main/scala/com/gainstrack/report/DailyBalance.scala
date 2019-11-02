package com.gainstrack.report

import com.gainstrack.command.AccountCreation
import com.gainstrack.core._

case class DailyBalance(balanceState: BalanceState, date:LocalDate = MaxDate) {
  //def balances:Map[AccountId, PositionSet] = balanceState.
  balanceState.balances.keys

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
    val children = accounts.filter(_.accountId.parentAccountId.getOrElse(AccountId(":na:")) == accountId).map(_.accountId)
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
