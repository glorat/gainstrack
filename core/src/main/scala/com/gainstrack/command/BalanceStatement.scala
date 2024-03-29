package com.gainstrack.command

import com.gainstrack.core._
import com.gainstrack.report.BalanceState

case class BalanceStatement(
                             date: LocalDate, // post or enter?
                             accountId:AccountId,
                             balance:Amount,
                             adjAccount:AccountId,
                             comments: Seq[String] = Seq()
                           ) extends AccountCommand {
  private val self = this

  val adjustment: BalanceAdjustment = BalanceAdjustment(date.plusDays(1), accountId, balance, adjAccount, Some(this))

  override def mainAccount: Option[AccountId] = Some(accountId)
  override def involvedAccounts: Set[AccountId] = adjustment.involvedAccounts
  override def commandString: String = BalanceStatement.prefix
  def description:String = s"Account balance ${balance}"

  // With old balance value, avoid using pad
  def toBeancounts(oldValue:Fraction, accts:Set[AccountCreation]) : Seq[BeancountCommand] = adjustment.toBeancounts(oldValue, accts)

  def toTransfers(accts: Set[AccountCreation], oldValue: Amount): Seq[Transfer] = adjustment.toTransfers(accts, oldValue)

  override def mergedWith(that: AccountCommand): MergeStrategy = {
    that match {
      case t:BalanceStatement if t==this => MergeConflict
      case t:UnitTrustBalance if this.date == t.date && this.accountId == t.accountId && this.balance.ccy == t.security.ccy => {
        MergeReplace
      }
      case b:BalanceStatement if this.date == b.date && this.accountId == b.accountId && this.balance.ccy == b.balance.ccy => {
        MergeReplace
      }
      case _ => super.mergedWith(that)
    }
  }

  def toGainstrack : Seq[String] = {
    Seq(s"${date} bal ${accountId.toGainstrack} ${balance} ${adjAccount.toGainstrack}")
  }

  override def toPartialDTO: AccountCommandDTO = {
    AccountCommandDTO(accountId = accountId, date = date, balance = Some(balance), otherAccount = Some(adjAccount))
  }

  /** Commands should write
   * this.copy(comments = newComments)
   * */
  override def withComments(newComments: Seq[String]): AccountCommand = {
    copy(comments = newComments)
  }
}


object BalanceStatement extends CommandParser {
  import Patterns._

  val prefix: String = "bal"
  private val balanceRe = raw"(\S+ \S+)"
  private val re =s"${datePattern} ${prefix} ${acctPattern} ${balanceRe} ${acctPattern}".r

  override def parse(str: String): BalanceStatement = {

    str match {
      case re(date, acct, balance, adjAcct) => {
        BalanceStatement(parseDate(date), AccountId(acct), balance, AccountId(adjAcct))
      }
    }
  }

}