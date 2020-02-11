package com.gainstrack.command

import com.gainstrack.core._

case class FundCommand(date:LocalDate, accountId:AccountId, balance:Amount, sourceAccountIdOpt:Option[AccountId] = None) extends CommandNeedsAccounts {
  override def description: String = s"Fund ${balance}"

  override def mainAccount: Option[AccountId] = Some(accountId)

  override def commandString: String = FundCommand.prefix

  // Leave as not implemented because we actually need to sub this out mid generation to a Transfer command
  override def involvedAccounts: Set[AccountId] = ???

  def toTransfers(accts:Set[AccountCreation]) : Seq[Transfer] = {
    val targetAccount = accts.find(_.accountId == accountId).get

    val sourceAccountId = sourceAccountIdOpt.getOrElse(
      targetAccount.options.fundingAccount.getOrElse(FundCommand.DEFAULT_FUND_ACCOUNT)
    )

    Transfer(sourceAccountId, accountId, date, balance, balance, description).toTransfers(accts)
  }

  override def toGainstrack: Seq[String] = {
    val s = if (sourceAccountIdOpt.isDefined) {
      s"${date} fund ${accountId.toGainstrack} ${sourceAccountIdOpt.get.toGainstrack} ${balance}"
    }
    else {
      s"${date} fund ${accountId.toGainstrack} ${balance}"
    }
    Seq(s)
  }

  override def toPartialDTO: AccountCommandDTO = {
    AccountCommandDTO(accountId = accountId, date = date, balance = Some(balance), otherAccount = sourceAccountIdOpt)
  }
}

object FundCommand extends CommandParser {
  val DEFAULT_FUND_ACCOUNT = AccountId("Equity:Opening")

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