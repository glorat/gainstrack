package com.gainstrack.report

import com.gainstrack.command._
import com.gainstrack.core._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}

case class CommandAccountExpander(acctState:Set[AccountCreation], cmds:Seq[AccountCommand]=Seq()) extends AggregateRootState {
  def handle(e: DomainEvent): CommandAccountExpander = {
    val newCmd:Seq[AccountCommand] = e match {
      case cmd : CommandNeedsAccounts => cmd.toTransfers(acctState)
      case a : AccountCommand => Seq(a)
    }
    copy(cmds = cmds ++ newCmd)
  }
}
