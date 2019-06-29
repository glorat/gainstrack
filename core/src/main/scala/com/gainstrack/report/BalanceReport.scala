package com.gainstrack.report

import com.gainstrack.core._

class BalanceReport(cmds:Seq[BeancountCommand], startDate:LocalDate=MinDate, endDate:LocalDate=MaxDate) {
  private var state = BalanceReportState()
  def getState:BalanceReportState = state

  cmds.foreach(cmd => {
    cmd match {
      case tx:Transaction => {
        if ( (tx.postDate.isAfter(startDate) || tx.postDate.isEqual(startDate))
        && (tx.postDate.isBefore(endDate))
        ) {
          state = state.processTx(tx)
        }
      }
      case _ => state
    }
  })
}

case class BalanceReportState(balances:Map[AccountId, PositionSet]) {

  def totalPosition(accountId:AccountId) : PositionSet = {
    balances.keys.toSeq.filter(_.isSubAccountOf(accountId)).foldLeft(PositionSet())((ps,account) => {
      val value = balances(account)
      ps + value
    })
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