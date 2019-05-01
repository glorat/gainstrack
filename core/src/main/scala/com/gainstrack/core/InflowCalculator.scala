package com.gainstrack.core

import com.gainstrack.command.{BalanceAdjustment, Transfer}

class InflowCalculator(bg:BeancountGenerator) {
  def calcInflows(accountId: AccountId) = {
    val otherMatch = "^(Equity|Asset|Liability).*"

    bg.txState.cmds.foldLeft(Seq[Cashflow]())((flow, cmd) => {
      cmd match {
        case tx: Transaction => {
          tx.origin match {
            // FIXME: Ensure "other" account is Equity/Asset/Liability?
            // Need a cash dividend use case
            case tfr: Transfer => {
              if (tfr.source.startsWith(accountId) && tfr.dest.matches(otherMatch)) {
                flow :+ Cashflow(tx.postDate, -tfr.sourceValue)
              }
              else if (tfr.source.matches("^(Equity|Asset|Liability).*") && tfr.dest.startsWith(accountId)) {
                flow :+ Cashflow(tx.postDate, -tfr.targetValue)
              }
              else {
                flow // Intra account trade
              }
            }
            case adj: BalanceAdjustment => {
              if (adj.accountId.startsWith(accountId)
                && !adj.adjAccount.startsWith(accountId)
                && adj.adjAccount.matches(otherMatch)
              ) {
                val tfr = tx.filledPostings.find(p => p.account == adj.accountId).get.value.get
                flow :+ Cashflow(tx.postDate, -tfr)
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