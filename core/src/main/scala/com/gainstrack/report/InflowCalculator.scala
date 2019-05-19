package com.gainstrack.report

import com.gainstrack.command.{BalanceAdjustment, CommandWithAccounts, Transfer}
import com.gainstrack.core.{AccountId, AccountType, Cashflow, Transaction, isSubAccountOf}

class InflowCalculator(txState:TransactionState, sources:Set[AccountType], multiplier:Double) {

  def calcInflows(accountId: AccountId) = {

    txState.cmds.foldLeft(Seq[Cashflow]())((flow, cmd) => {
      cmd match {
        case tx: Transaction => {

          def processTransfer(tfr: Transfer) = {

            if (tfr.source.isSubAccountOf(accountId) && sources.contains(tfr.dest.accountType)) {
              flow :+ Cashflow(tx.postDate, -(tfr.sourceValue * multiplier))
            }
            else if (sources.contains(tfr.source.accountType) && tfr.dest.isSubAccountOf(accountId)) {
              flow :+ Cashflow(tx.postDate, tfr.targetValue * multiplier)
            }
            else {
              flow // Intra account trade
            }

          }

          def processBalance(adj: BalanceAdjustment) = {

            if (adj.accountId.isSubAccountOf(accountId)
              && !adj.adjAccount.isSubAccountOf(accountId)
              && sources.contains(adj.adjAccount.accountType)
            ) {
              val tfr = tx.filledPostings.find(p => p.account == adj.accountId).get.value.get
              flow :+ Cashflow(tx.postDate, tfr * multiplier)
            }
            else {
              flow
            }
          }

          def processCommand(cmd:CommandWithAccounts[_]) = {
            cmd.underlying match {
              case tfr : Transfer => processTransfer(tfr)
              case _ => flow
            }
          }

          tx.origin match {
            case a: CommandWithAccounts[_] => processCommand(a)
            case tfr: Transfer => processTransfer(tfr)
            case adj: BalanceAdjustment => processBalance(adj)
            case _ => flow
          }
        }
        case _ => flow
      }
    })
  }
}