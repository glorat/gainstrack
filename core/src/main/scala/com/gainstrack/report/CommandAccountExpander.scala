package com.gainstrack.report

import com.gainstrack.command._
import com.gainstrack.core._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}

case class CommandAccountExpander(acctState:Set[AccountCreation], cmds:Seq[AccountCommand]=Seq()) extends AggregateRootState {
  def handle(e: DomainEvent): CommandAccountExpander = {
    val newCmd:AccountCommand = e match {
      case cmd: CommandNeedsAccounts => CommandWithAccounts(cmd, acctState)
      case a : AccountCommand => a
    }
    copy(cmds = cmds :+ newCmd)
  }
}
