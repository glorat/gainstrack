package com.gainstrack.report

import com.gainstrack.command.{BalanceAdjustment, Transfer}
import com.gainstrack.core.{AccountId, AccountType, Cashflow, Transaction, isSubAccountOf}

class InflowCalculator(txState:TransactionState, sources:Set[AccountType], multiplier:Double) {

  def calcInflows(accountId: AccountId) = {

    txState.cmds.foldLeft(Seq[Cashflow]())((flow, cmd) => {
      cmd match {
        case tx: Transaction => {
          tx.origin match {
            case tfr: Transfer => {
              if ( isSubAccountOf(tfr.source, accountId) && sources.contains(AccountType.fromAccountId(tfr.dest))) {
                flow :+ Cashflow(tx.postDate, -(tfr.sourceValue * multiplier))
              }
              else if (sources.contains(AccountType.fromAccountId(tfr.source)) && isSubAccountOf(tfr.dest, accountId)) {
                flow :+ Cashflow(tx.postDate, tfr.targetValue * multiplier)
              }
              else {
                flow // Intra account trade
              }
            }
            case adj: BalanceAdjustment => {
              if ( isSubAccountOf(adj.accountId, accountId)
                && !isSubAccountOf(adj.adjAccount, accountId)
                && sources.contains(AccountType.fromAccountId(adj.adjAccount))
              ) {
                val tfr = tx.filledPostings.find(p => p.account == adj.accountId).get.value.get
                flow :+ Cashflow(tx.postDate, tfr * multiplier)
              }
              else {
                flow
              }
            }
            case _ => flow
          }
        }
        case _ => flow
      }
    })
  }
}