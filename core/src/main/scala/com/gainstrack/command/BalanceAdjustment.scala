package com.gainstrack.command

import com.gainstrack.core._
import com.gainstrack.report.BalanceState

case class BalanceAdjustment(
                              date: LocalDate, // post or enter?
                              accountId:AccountId,
                              balance:Amount,
                              adjAccount:AccountId,
                              myOrigin: Option[AccountCommand]
                            ) extends AccountCommand {
  private val self = this

  def origin: AccountCommand = myOrigin.getOrElse(this)
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
  def toBeancounts(oldValue: Fraction, accts:Set[AccountCreation]) : Seq[BeancountCommand] = {
    val account = accts.find(_.accountId == accountId).getOrElse(throw new IllegalStateException(s"Account ${accountId} is not defined"))
    val targetAccountId = if (account.options.multiAsset) accountId.subAccount(balance.ccy.symbol) else accountId

    val newUnits = balance-oldValue
    val balanceAssertion = BalanceAssertion(date, targetAccountId, balance, origin)
    if (newUnits.number == zeroFraction) {
      Seq(balanceAssertion)
    }
    else {
      val tfrExpand = toTransfers(accts, Amount(oldValue, balance.ccy.symbol))
      val txs: Seq[Transaction] = tfrExpand.map(_.toTransaction.copy(origin = origin))
      txs :+ balanceAssertion
    }
  }

  def toTransfers(accts:Set[AccountCreation], oldValue:Amount) : Seq[Transfer] = {
    val account = accts.find(_.accountId == accountId).getOrElse(throw new IllegalStateException(s"Account ${accountId} is not defined"))
    val newUnits = balance - oldValue
    if (newUnits.number == zeroFraction) {
      Seq()
    }
    else {
      val description = s"Adjustment: ${oldValue} -> ${balance}"
      val tfr = Transfer(adjAccount, accountId, date.minusDays(1), newUnits, newUnits, description)
      val tfrExpand = tfr.toTransfers(accts)
      tfrExpand
    }
  }

  def toGainstrack : Seq[String] = {
    Seq(s"${date} adj ${accountId.toGainstrack} ${balance} ${adjAccount.toGainstrack}")
  }

  override def toPartialDTO: AccountCommandDTO = {
    AccountCommandDTO(accountId = accountId, date = date, balance = Some(balance), otherAccount = Some(adjAccount))
  }
}

case class BalanceAssertion(date:LocalDate, accountId:AccountId, balance:Amount, origin:AccountCommand)
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
        BalanceAdjustment(parseDate(date), AccountId(acct), balance, AccountId(adjAcct), None)
      }
    }
  }

}