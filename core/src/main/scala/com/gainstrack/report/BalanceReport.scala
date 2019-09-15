package com.gainstrack.report

import com.gainstrack.command.AccountCreation
import com.gainstrack.core._

/**
  * Generates a projection of the balance of all accounts given a date
  * @param cmds
  * @param startDate
  * @param endDate
  */
class BalanceReport(cmds:Seq[BeancountCommand], criteria:Transaction=>Boolean) {
  private var state = BalanceReportState()
  def getState:BalanceReportState = state

  cmds.foreach(cmd => {
    cmd match {
      case tx:Transaction if criteria(tx) => {
        state = state.processTx(tx)
      }
      case _ => state
    }
  })
}

object BalanceReport {
  def apply(cmds:Seq[BeancountCommand], startDate:LocalDate=MinDate, endDate:LocalDate=MaxDate) : BalanceReport = {
    val criteria:Transaction=>Boolean = tx =>  (tx.postDate.isAfter(startDate) || tx.postDate.isEqual(startDate)) && (tx.postDate.isBefore(endDate))
    new BalanceReport(cmds, criteria)
  }

  def apply(cmds:Seq[BeancountCommand]) : BalanceReport = {
    new BalanceReport(cmds, x => true)
  }
}

case class BalanceReportState(balances:Map[AccountId, PositionSet]) {

  def totalPosition(accountId:AccountId) : PositionSet = {
    balances.keys.toSeq.filter(_.isSubAccountOf(accountId)).foldLeft(PositionSet())((ps,account) => {
      val value = balances(account)
      ps + value
    })
  }

  def convertedPosition(accountId:AccountId, acctState:AccountState, priceState: PriceState, date:LocalDate):PositionSet = {
    val accounts = acctState.withInterpolatedAccounts.accounts
    val children = accounts.filter(_.accountId.parentAccountId.getOrElse(AccountId(":na:")) == accountId).map(_.accountId)
    val childBalances = children.foldLeft(PositionSet())(_ + convertedPosition(_, acctState, priceState, date))
    val positions = childBalances + balances.getOrElse(accountId, PositionSet())
    val converted:PositionSet = acctState.accountMap.get(accountId)
      .map(_.key.assetId)
      .map(tgtCcy => { positions.convertTo(tgtCcy, priceState, date)})
      //.map(res => {println (s"${accountId} has ${res}"); res})
      .getOrElse(positions)
    converted
  }

  def processTx(tx:Transaction) : BalanceReportState = {
    tx.filledPostings.foldLeft(this)(BalanceReportState.processPosting)
  }


}

object BalanceReportState {
  def apply() : BalanceReportState = {
    BalanceReportState(Map())
  }

  private def processPosting(self:BalanceReportState, posting:Posting) = {
    val oldPosition = self.balances.get(posting.account).getOrElse(PositionSet())
    val newPosition = oldPosition + posting.value.get
    val newBalance = self.balances.updated(posting.account, newPosition)
    self.copy(balances = newBalance)
  }
}