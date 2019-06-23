package com.gainstrack.report

import com.gainstrack.command.{BalanceAdjustment, CommandWithAccounts, Transfer}
import com.gainstrack.core._

class InflowCalculator( cmds:Seq[BeancountCommand]) {

  def calcInflows(accountId: AccountId) = {
    val relatedAccounts = AccountType.all.map(t => accountId.convertType(t))

    // TODO: This can probably be a property of AccountType
    def accountTypeMultipler(t:AccountType) : Double = {
      t match {
        case Assets => -1.0
        case Liabilities => 1.0
        case Income => 1.0
        case Expenses => -1.0
        case Equity => -1.0
      }
    }
    val mult = accountTypeMultipler(accountId.accountType)

    cmds.foldLeft(Seq[Cashflow]())((flow, cmd) => {
      cmd match {
        case tx: Transaction => {

          def processTransfer(tfr: Transfer) = {

            if (tfr.source.isSubAccountOf(accountId) && !relatedAccounts.exists(r => tfr.dest.isSubAccountOf(r))) {
              flow :+ Cashflow(tx.postDate, tfr.sourceValue * mult)
            }
            else if (!relatedAccounts.exists(r => tfr.source.isSubAccountOf(r)) && tfr.dest.isSubAccountOf(accountId)) {
              flow :+ Cashflow(tx.postDate, tfr.targetValue * mult)
            }
            else {
              flow // Intra account trade
            }

          }

          def processBalance(adj: BalanceAdjustment) = {

            if (adj.accountId.isSubAccountOf(accountId)
              && !adj.adjAccount.isSubAccountOf(accountId)
              && !relatedAccounts.exists(r => adj.adjAccount.isSubAccountOf(r))
            ) {
              val tfr = tx.filledPostings.find(p => p.account == adj.accountId).get.value.get
              flow :+ Cashflow(tx.postDate, tfr * mult)
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