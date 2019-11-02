package controllers

import com.gainstrack.command.AccountCreation
import com.gainstrack.core._
import com.gainstrack.report._

import scala.xml.Elem

case class TreeTableDTO(name:String, shortName:String, children: Seq[TreeTableNodeDTO], assetBalance:Seq[String])
case class TreeTableNodeDTO(name:String, shortName:String, children:Seq[TreeTableNodeDTO], assetBalance:Seq[String])

class BalanceTreeTable(acctState:AccountState, priceState:PriceState, date:LocalDate, balanceReport:DailyBalance, conversionStrategy:String) {
  val allAcctState = acctState.withInterpolatedAccounts


  def toTreeTable(acctId: AccountId):TreeTableDTO = {
    val balance = balanceReport.convertedPosition(acctId, acctState, priceState, date, conversionStrategy)

    // TODO: Sort the sequence alphabetically
    TreeTableDTO(acctId.toString, acctId.shortName, allAcctState.childrenOf(acctId).toSeq.map(acct => toTreeTableNode(acct.accountId)), balance.assetBalance.map(e=>s"${e._2.toDouble.formatted("%.2f")} ${e._1.symbol}").toSeq)
  }

  def toTreeTableNode(acctId: AccountId): TreeTableNodeDTO = {
    val balance = balanceReport.convertedPosition(acctId, acctState, priceState, date, conversionStrategy)
    // TODO: Sort the sequence alphabetically
    TreeTableNodeDTO(acctId.toString, acctId.shortName, allAcctState.childrenOf(acctId).toSeq.map(acct => toTreeTableNode(acct.accountId)), balance.assetBalance.map(e=>s"${e._2.toDouble.formatted("%.2f")} ${e._1.symbol}").toSeq)
  }
}
