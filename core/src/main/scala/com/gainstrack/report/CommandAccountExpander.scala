package com.gainstrack.report

import com.gainstrack.command._
import com.gainstrack.core._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}

case class CommandAccountExpander(acctState:AccountState, cmds:Seq[AccountCommand]=Seq()) extends AggregateRootState {
  private val accountSet = acctState.accounts
  private val mockBalanceState = BalanceState.mock(accountSet)

  def handle(e: DomainEvent): CommandAccountExpander = {
    val newCmd:AccountCommand = e match {
      case cmd: CommandNeedsAccounts => CommandWithAccounts(cmd, accountSet)
      case a : AccountCommand => a
    }
    val newAcctState: AccountState = newCmd match {
       case cmd:CommandWithAccounts[_] => {
         val newAcctIds =
           cmd.toTransfers
             .map(_.toTransaction).flatMap(_.filledPostings).map(_.account)
           .filter(id => !accountSet.exists(_.accountId == id))
         newAcctIds.foldLeft(acctState)(_.withInferredAccount(_))
       }
       case bal: BalanceAdjustment => {
         val newAcctIds = bal.toTransfers(acctState.accounts)
           .map(_.toTransaction).flatMap(_.filledPostings).map(_.account)
           .filter(id => !accountSet.exists(_.accountId == id))
         newAcctIds.foldLeft(acctState)(_.withInferredAccount(_))

         /*

         val transferOpt = bal.toBeancounts(mockBalanceState, acctState.accounts).find(_.isInstanceOf[Transfer])
         transferOpt.map(tfr => {
           val newAcctIds =
             tfr.asInstanceOf[Transfer].toTransaction.filledPostings.map(_.account)
               .filter(id => !accountSet.exists(_.accountId == id))
           newAcctIds.foldLeft(acctState)(_.withInferredAccount(_))
         }).getOrElse(acctState)*/
       }
       case _ => acctState
     }
    copy(cmds = cmds :+ newCmd, acctState = newAcctState)
  }
}

