package com.gainstrack.core

import com.gainstrack.command.{BalanceAdjustment, Transfer}

class InflowCalculator(bg:BeancountGenerator, sources:Set[AccountType], multiplier:Double) {
  def calcInflows(accountId: AccountId) = {

    bg.txState.cmds.foldLeft(Seq[Cashflow]())((flow, cmd) => {
      cmd match {
        case tx: Transaction => {
          tx.origin match {
            case tfr: Transfer => {
              if ( tfr.source.startsWith(accountId) && sources.contains(AccountType.fromAccountId(tfr.dest))) {
                flow :+ Cashflow(tx.postDate, tfr.sourceValue * multiplier)
              }
              else if (sources.contains(AccountType.fromAccountId(tfr.source)) && tfr.dest.startsWith(accountId)) {
                flow :+ Cashflow(tx.postDate, tfr.targetValue * multiplier)
              }
              else {
                flow // Intra account trade
              }
            }
            case adj: BalanceAdjustment => {
              if (adj.accountId.startsWith(accountId)
                && !adj.adjAccount.startsWith(accountId)
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