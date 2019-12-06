package com.gainstrack.report

import com.gainstrack.command.AccountCreation
import com.gainstrack.core.{AccountId, AssetId, Amount, LocalDate, PositionSet, zeroFraction}

class BalanceConversion(
                         conversionStrategy: String,
                         thisCcy: AssetId,
                         acctToPosition: (AccountId => PositionSet),
                         date: LocalDate
                       ) (acctState:AccountState, priceState: PriceState, assetChainMap: AssetChainMap) {

  val convert: (AccountId => PositionSet) = acct => {
    val positions: PositionSet = acctToPosition(acct)
    val converted = conversionStrategy match {
      case "" | "parent" =>
        positions.convertViaChain(thisCcy, assetChainMap(acct), priceState, date)
      case "units" =>
        positions.convertViaChain(AssetId("NOVALIDUNIT"), assetChainMap(acct).takeRight(1), priceState, date)
      case "global" =>
        positions.convertViaChain(acctState.baseCurrency, assetChainMap(acct), priceState, date)
      case ccy: String =>
        positions.convertViaChain(AssetId(ccy), assetChainMap(acct), priceState, date)
    }
    converted
  }

  def convert(accts:Set[AccountId]) : PositionSet = {
    val positions = accts.foldLeft(PositionSet())(_ + this.convert(_))
    positions
  }

  def convertTotal(accountId:AccountId, accountFilter:(AccountCreation=>Boolean)) : PositionSet = {
    val children = acctState.accounts
      .filter(_.accountId.isSubAccountOf(accountId))
      .filter(accountFilter)
      .map(_.accountId)

    convert(children)
  }

}
