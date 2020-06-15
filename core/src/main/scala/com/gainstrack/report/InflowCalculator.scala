package com.gainstrack.report

import com.gainstrack.command.{BalanceAdjustment, CommandWithAccounts, Transfer}
import com.gainstrack.core._

class InflowCalculator( cmds:Seq[BeancountCommand]) {

  def calcInflows(accountId: AccountId): Seq[Cashflow] = {
    val relatedAccounts = AccountType.all.map(t => accountId.convertType(t))

    cmds.foldLeft(Seq[Cashflow]())((flow, cmd) => {
      cmd match {
        case tx: Transaction => {

          val fps = tx.postings
          val others = fps.filter(p => !(p.account.isSubAccountOf(accountId) || relatedAccounts.exists(p.account.isSubAccountOf(_))))

          if (others.size > 0 && others.size < fps.size) {
            // This transaction is between inside and outside world so there must be an inflow/outflow
            require(others.size == 1, "Inflow calculator can only handle single external flow target currently")
            flow :+ Cashflow(tx.postDate, others(0).value.get, others(0).account)
          }
          else {
            flow
          }
        }
        case _ => flow
      }
    })
  }
}