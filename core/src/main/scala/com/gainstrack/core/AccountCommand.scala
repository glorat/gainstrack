package com.gainstrack.core

import com.gainstrack.command.{BalanceAdjustment, BalanceStatement, GlobalCommand}
import net.glorat.cqrs.{Command, DomainEvent}

trait AccountCommand extends Command with DomainEvent with Ordered[AccountCommand] {
  // Mandatory fields
  def date : LocalDate
  def commandString: String // The stored short version
  def description: String
  def toGainstrack: Seq[String]

  // Required for filtering
  def mainAccount : Option[AccountId]
  def involvedAccounts : Set[AccountId]

  // Helper methods
  def hasMainAccount(accountId:Option[AccountId]) : Boolean = mainAccount == accountId
  def usesAccount(accountId: AccountId) : Boolean = involvedAccounts.contains(accountId) ||  mainAccount == Some(accountId)
  def usesSubAccountOf(parentId: AccountId) : Boolean = involvedAccounts.find(a => a.isSubAccountOf(parentId)).isDefined

  override def compare(that: AccountCommand): Int = {
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

  private def toOrderValue:Long = {
    // Balance assertions come first because beancount assertion counts in the morning of the day
    val classValue = this match {
      case _: BalanceAdjustment => 1
      case _: GlobalCommand => 0
      case _: BalanceStatement => 1
      case _ => 2
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
