package com.gainstrack.command

import com.gainstrack.core._
import com.gainstrack.report.BalanceState

case class BalanceStatement(
                             date: LocalDate, // post or enter?
                             accountId:AccountId,
                             balance:Amount,
                             adjAccount:AccountId
                           ) extends AccountCommand {
  private val self = this

  val adjustment = BalanceAdjustment(date.plusDays(1), accountId, balance, adjAccount)

  override def mainAccount: Option[AccountId] = Some(accountId)
  override def involvedAccounts: Set[AccountId] = adjustment.involvedAccounts
  override def commandString: String = "adj"
  def description:String = s"Account balance ${balance}"

  // With old balance value, avoid using pad
  def toBeancounts(balanceState:BalanceState, accts:Set[AccountCreation]) : Seq[BeancountCommand] = adjustment.toBeancounts(balanceState, accts)

  def toTransfers(accts:Set[AccountCreation]) : Seq[Transfer] = adjustment.toTransfers(accts)

  def toGainstrack : Seq[String] = {
    Seq(s"${date} bal ${accountId.toGainstrack} ${balance} ${adjAccount.toGainstrack}")
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