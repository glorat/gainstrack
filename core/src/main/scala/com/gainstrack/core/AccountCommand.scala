package com.gainstrack.core

import com.gainstrack.command.{AccountCreation, BalanceAdjustment, BalanceStatement, GlobalCommand, UnitTrustBalance}
import net.glorat.cqrs.{Command, DomainEvent}

trait AccountCommand extends Command with DomainEvent  {
  /** Commands should write
   * this.copy(comments = newComments)
   * */
  def withComments(newComments: Seq[String]): AccountCommand

  // with Ordered[AccountCommand]

  // Mandatory fields
  def date : LocalDate
  def commandString: String // The stored short version
  def description: String
  def toGainstrack: Seq[String]
  def comments: Seq[String]
  def toGainstrackWithComments: Seq[String] = {
    comments.map(x => s"; ${x}") ++ toGainstrack
  }
  def toPartialDTO: AccountCommandDTO
  def toDTO: AccountCommandDTO = toPartialDTO.autoFill(this)

  // Required for filtering
  def mainAccount : Option[AccountId]
  def involvedAccounts : Set[AccountId]

  // Helper methods
  def hasMainAccount(accountId:Option[AccountId]) : Boolean = mainAccount == accountId
  def usesAccount(accountId: AccountId) : Boolean = involvedAccounts.contains(accountId) ||  mainAccount == Some(accountId)
  def usesSubAccountOf(parentId: AccountId) : Boolean = involvedAccounts.find(a => a.isSubAccountOf(parentId)).isDefined

  def mergedWith(that: AccountCommand): MergeStrategy = {
    if (this == that) MergeConcat else MergeConcat
  }

  def compare(that: AccountCommand): Int = {
    val ord = this.toOrderValue.compare(that.toOrderValue)
    if (ord == 0) {
      // Need an arbitrary fallback comparison
      //val ret = this.toGainstrack.mkString("").compareTo(that.toGainstrack.mkString(""))
      //ret
      // FIXME: There is obviously some bug that is incorrectly relying
      // FIXME: on existing ordering to be maintained
      1
    }
    else {
      ord
    }
  }

  def toOrderValue:Long = {
    // Balance assertions come first because implementation based on beancount which
    // checks assertion counts in the morning of the day
    val classValue = this match {
      case _: GlobalCommand => 0
      case _: AccountCreation => 1
      case _: BalanceAdjustment => 2
      case _: BalanceStatement => 2
        // These ones should come after because they are also balances
      case _: UnitTrustBalance => 4
        // All else in the middle
      case _ => 3
    }

    val theDate = this match {
      case bal: BalanceStatement => bal.adjustment.date
      case _ => date
    }
    (theDate.toEpochDay*10) + classValue
  }

  def withOption(key:String, valueStr:String):AccountCommand = {
    throw new IllegalArgumentException(s"Option ${key} is not supported by ${this.getClass.getName}")
  }
}

object AccountCommand {
  def sorted(cmds: Seq[AccountCommand]) : Seq[AccountCommand] = {
    cmds.zipWithIndex.sortBy(x => {
      // Rely on orderValue first, and line number otherwise
      x._1.toOrderValue*10000 + x._2
    }).map(_._1)
  }
}

sealed trait MergeStrategy
// Okay to merge command to set
case object MergeConcat extends MergeStrategy
// User error
case object MergeConflict extends MergeStrategy
// Replace old command with this
case object MergeReplace extends MergeStrategy