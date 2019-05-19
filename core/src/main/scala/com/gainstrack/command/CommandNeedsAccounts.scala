package com.gainstrack.command

import com.gainstrack.core._

trait CommandNeedsAccounts extends AccountCommand {
  def toTransfers(accounts:Set[AccountCreation]) : Seq[Transfer]
}

case class CommandWithAccounts[T<:CommandNeedsAccounts](underlying:T, accounts:Set[AccountCreation]) extends AccountCommand {
  def date = underlying.date

  override def description: String = underlying.description

  override def involvedAccounts: Set[AccountId] = underlying.toTransfers(accounts).map(_.involvedAccounts).flatten.toSet

  // TODO: This API must change
  override def mainAccounts: Set[AccountId] = underlying.toTransfers(accounts).map(_.involvedAccounts).flatten.toSet

  def toTransfers: Seq[Transfer] = underlying.toTransfers(accounts)
}
