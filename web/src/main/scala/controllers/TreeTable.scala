package controllers

import com.gainstrack.command.AccountCreation
import com.gainstrack.core._
import com.gainstrack.report._

import scala.xml.Elem

case class TreeTableDTO(
                         name:String,
                         shortName:String,
                         children: Seq[TreeTableDTO],
                         assetBalance:Seq[Map[String,Any]])


class BalanceTreeTable(
                        acctState:AccountState,
                        priceState:PriceState,
                        assetChainMap: AssetChainMap,
                        date:LocalDate,
                        balanceReport:DailyBalance,
                        conversionStrategy:String,
                        accountFilter: AccountCreation=>Boolean
                      ) {
  val allAcctState = acctState.withInterpolatedAccounts


  def toTreeTable(acctId: AccountId):TreeTableDTO = {
    val balance = balanceReport.convertedPosition(acctId, date, conversionStrategy, accountFilter)(acctState, priceState, assetChainMap)

    // TODO: Sort the sequence alphabetically
    TreeTableDTO(acctId.toString, acctId.shortName,
      allAcctState.childrenOf(acctId).toSeq.sortBy(_.accountId).map(acct => toTreeTable(acct.accountId)),
      balance.toDTO)
  }
}
