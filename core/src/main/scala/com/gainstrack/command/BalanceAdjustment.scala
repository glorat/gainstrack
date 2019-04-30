package com.gainstrack.command

import com.gainstrack.core._

case class BalanceAdjustment(
                              date: LocalDate, // post or enter?
                              accountId:AccountId,
                              balance:Balance,
                              adjAccount:AccountId
                            ) extends AccountCommand {
  /*val relatedAccount : AccountId = {
    val parts:Seq[String] = accountId.split(":").updated(0,"Equity").toSeq
    parts.mkString(":")
  }*/
  def toBeancounts : Seq[String] = {
    val l1 = s"${date.minusDays(1)} pad ${accountId} ${adjAccount}"
    val l2 = s"${date} balance ${accountId} ${balance}"
    Seq(l1,l2)
  }

  // With old balance value, avoid using pad
  def toBeancounts(oldValue:Fraction) : Seq[String] = {
    val newUnits = balance-oldValue
    val unitIncrease : Posting = Posting(accountId, newUnits )
    val income:Posting = Posting(adjAccount, -newUnits)
    val tx = Transaction(date.minusDays(1), s"Adjustment: ${oldValue.toDouble} -> ${balance}", Seq(unitIncrease, income)).toBeancount
    val bal = s"${date} balance ${accountId} ${balance}"
    Seq(tx, bal)
  }

  def toBeancountCommand(oldValue:Fraction) : BeancountCommand = {
    new BeancountCommand {
      override def toBeancount: String = toBeancounts(oldValue).mkString("\n")
    }
  }
}

object BalanceAdjustment extends CommandParser {
  import Patterns._

  val prefix: String = "adj"
  private val balanceRe = raw"(\S+ \S+)"
  private val re =s"${datePattern} ${prefix} ${acctPattern} ${balanceRe} ${acctPattern}".r

  override def parse(str: String): BalanceAdjustment = {

    str match {
      case re(date, acct, balance, adjAcct) => {
        BalanceAdjustment(parseDate(date), acct, balance, adjAcct)
      }
    }
  }

}