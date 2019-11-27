package com.gainstrack.command

import com.gainstrack.core._
import com.gainstrack.report.BalanceState

case class BalanceAdjustment(
                              date: LocalDate, // post or enter?
                              accountId:AccountId,
                              balance:Balance,
                              adjAccount:AccountId
                            ) extends AccountCommand {
  private val self = this

  override def mainAccount: Option[AccountId] = Some(accountId)
  // FIXME: Unless there is no adjustment
  override def involvedAccounts: Set[AccountId] = Set(accountId, adjAccount)
  override def commandString: String = "adj"
  def description:String = s"Account balance ${balance}"

  /*val relatedAccount : AccountId = {
    val parts:Seq[String] = accountId.split(":").updated(0,"Equity").toSeq
    parts.mkString(":")
  }*/
  /*
  def toBeancounts : Seq[String] = {
    val l1 = s"${date.minusDays(1)} pad ${accountId} ${adjAccount}"
    val l2 = s"${date} balance ${accountId} ${balance}"
    Seq(l1,l2)
  }*/

  // With old balance value, avoid using pad
  def toBeancounts(balanceState:BalanceState, accts:Set[AccountCreation]) : Seq[BeancountCommand] = {
    val account = accts.find(_.accountId == accountId).getOrElse(throw new IllegalStateException(s"Account ${accountId} is not defined"))
    val targetAccountId = if (account.options.multiAsset) accountId.subAccount(balance.ccy.symbol) else accountId
    val oldValue = balanceState.getAccountValue(targetAccountId, date.minusDays(1))

    val newUnits = balance-oldValue
    if (newUnits.value == zeroFraction) {
      Seq(BalanceAssertion(date, targetAccountId, balance, this))
    }
    else {
      val unitIncrease : Posting = Posting(targetAccountId, newUnits )
      val income:Posting = Posting(adjAccount, -newUnits)
      // Apply padding the day before since the balance assertion happens in the morning of the declared day
      val description = s"Adjustment: ${oldValue.toDouble} -> ${balance}"
      val tfr = Transfer(adjAccount, targetAccountId, date.minusDays(1), newUnits, newUnits, description)
      val tfrExpand = tfr.toTransfers(accts)
      val txs: Seq[Transaction] = tfrExpand.map(_.toTransaction)
      //val tx = Transaction(date.minusDays(1), description, Seq(unitIncrease, income), this)
      val balcmd = BalanceAssertion(date, targetAccountId, balance, this)
      txs :+ balcmd
    }
  }

  def toTransfers(accts:Set[AccountCreation]) : Seq[Transfer] = {
    val account = accts.find(_.accountId == accountId).getOrElse(throw new IllegalStateException(s"Account ${accountId} is not defined"))
    val newUnits = Balance(9999, balance.ccy.symbol)

    val description = s"Adjustment: TO BE FILLED IN"
    val tfr = Transfer(adjAccount, accountId, date.minusDays(1), newUnits, newUnits, description)
    val tfrExpand = tfr.toTransfers(accts)
    tfrExpand
  }

  def toGainstrack : Seq[String] = {
    Seq(s"${date} adj ${accountId.toGainstrack} ${balance} ${adjAccount.toGainstrack}")
  }
}

case class BalanceAssertion(date:LocalDate, accountId:AccountId, balance:Balance, origin:BalanceAdjustment)
  extends BeancountCommand {

  override def toBeancount: Seq[BeancountLine] = BeancountLines(s"${date} balance ${accountId} ${balance}", origin)
}

object BalanceAdjustment extends CommandParser {
  import Patterns._

  val prefix: String = "adj"
  private val balanceRe = raw"(\S+ \S+)"
  private val re =s"${datePattern} ${prefix} ${acctPattern} ${balanceRe} ${acctPattern}".r

  override def parse(str: String): BalanceAdjustment = {

    str match {
      case re(date, acct, balance, adjAcct) => {
        BalanceAdjustment(parseDate(date), AccountId(acct), balance, AccountId(adjAcct))
      }
    }
  }

}