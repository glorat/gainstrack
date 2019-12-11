package com.gainstrack.command

import com.gainstrack.core._

case class FundCommand(date:LocalDate, targetAccountId:AccountId, balance:Amount, sourceAccountIdOpt:Option[AccountId] = None) extends CommandNeedsAccounts {
  override def description: String = s"Fund ${balance}"

  override def mainAccount: Option[AccountId] = Some(targetAccountId)

  override def commandString: String = FundCommand.prefix

  // Leave as not implemented because we actually need to sub this out mid generation to a Transfer command
  override def involvedAccounts: Set[AccountId] = ???

  def toTransfers(accts:Set[AccountCreation]) : Seq[Transfer] = {
    val targetAccount = accts.find(_.accountId == targetAccountId).get

    val sourceAccountId = sourceAccountIdOpt.getOrElse(
      targetAccount.options.fundingAccount.getOrElse(throw new IllegalStateException(s"Cannot fund ${targetAccount} without a fundingAccount option specified in its creation"))
    )

    Transfer(sourceAccountId, targetAccountId, date, balance, balance, description).toTransfers(accts)
  }

  override def toGainstrack: Seq[String] = {
    val s = if (sourceAccountIdOpt.isDefined) {
      s"${date} fund ${targetAccountId.toGainstrack} ${sourceAccountIdOpt.get.toGainstrack} ${balance}"
    }
    else {
      s"${date} fund ${targetAccountId.toGainstrack} ${balance}"
    }
    Seq(s)
  }
}

object FundCommand extends CommandParser {

  import Patterns._
  val prefix: String = "fund"
  private val SimpleFund =s"${datePattern} ${prefix} ${acctPattern} ${balanceMatch}".r
  private val Fund = s"${datePattern} ${prefix} ${acctPattern} ${acctPattern} ${balanceMatch}".r
  override def parse(str: String): AccountCommand = {
    str match {
      case SimpleFund(dateStr, tgtAcct, balanceStr) => FundCommand(parseDate(dateStr), AccountId(tgtAcct), Amount.parse(balanceStr), None)
      case Fund(dateStr, tgtAcct, fundAcct, balanceStr) => FundCommand(parseDate(dateStr), AccountId(tgtAcct), Amount.parse(balanceStr), Some(AccountId(fundAcct)))
    }
  }


}