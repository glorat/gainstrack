package com.gainstrack.web

import com.gainstrack.command.AccountCreation
import com.gainstrack.core._
import com.gainstrack.report._

case class TreeTableDTO(
                         name:String,
                         shortName:String,
                         children: Seq[TreeTableDTO],
                         assetBalance:Seq[Map[String,Any]])


class BalanceTreeTable(date: LocalDate, conversionStrategy: String, accountFilter: AccountCreation => Boolean)
                      (implicit acctState: AccountState, priceState: PriceFXConverter, assetChainMap: AssetChainMap, balanceReport: DailyBalance, singleFXConversion: SingleFXConverter) {
  val allAcctState = acctState.withInterpolatedAccounts


  def toTreeTable(acctId: AccountId):TreeTableDTO = {
    val balance = balanceReport.convertedPosition(acctId, date, conversionStrategy, accountFilter)

    // TODO: Sort the sequence alphabetically
    TreeTableDTO(acctId.toString, acctId.shortName,
      allAcctState.childrenOf(acctId).toSeq.sortBy(_.accountId).map(acct => toTreeTable(acct.accountId)),
      balance.toDTO)
  }
}
