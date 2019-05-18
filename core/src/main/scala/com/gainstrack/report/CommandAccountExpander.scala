package com.gainstrack.report

import com.gainstrack.command._
import com.gainstrack.core._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}

case class CommandAccountExpander(acctState:Set[AccountCreation], cmds:Seq[AccountCommand]=Seq()) extends AggregateRootState {
  def handle(e: DomainEvent): CommandAccountExpander = {
    // Might need to be Seq[Command] in future
    // e.g. for Unit command that needs two transfers
    val newCmd:AccountCommand = e match {
      case fund : FundCommand => fund.toTransfer(acctState)
      case earn: EarnCommand => earn.toTransfer(acctState)
      case y: YieldCommand => y.toTransfer(acctState)
      case a : AccountCommand => a
    }
    copy(cmds = cmds :+ newCmd)
  }
}
