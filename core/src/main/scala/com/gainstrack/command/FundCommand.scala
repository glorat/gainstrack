package com.gainstrack.command

import com.gainstrack.core._

case class FundCommand(date:LocalDate, targetAccountId:AccountId, value:Balance, sourceAccountIdOpt:Option[AccountId] = None) extends AccountCommand {
  override def description: String = s"Fund ${targetAccountId} ${value}"

  // Leave as not implemented because we actually need to sub this out mid generation to a Transfer command
  override def mainAccounts: Set[AccountId] = ???

  override def involvedAccounts: Set[AccountId] = ???

  def toTransfer(accts:Set[AccountCreation]) : Transfer = {
    val targetAccount = accts.find(_.accountId == targetAccountId).get

    val sourceAccountId = sourceAccountIdOpt.getOrElse(
      targetAccount.options.fundingAccount.getOrElse(throw new IllegalStateException(s"Cannot fund ${targetAccount} without a fundingAccount option specified in its creation"))
    )
    // Multi-asset accounts have a dedicated sub funding account
    val targetFundingAccountId = if (targetAccount.options.multiAsset) targetAccountId.subAccount(value.ccy.symbol) else targetAccountId
    Transfer(sourceAccountId, targetFundingAccountId, date, value, value, description)
  }
}

object FundCommand extends CommandParser {

  import Patterns._
  val prefix: String = "fund"
  private val Fund =s"${datePattern} ${prefix} ${acctPattern} ${balanceMatch}".r


  override def parse(str: String): AccountCommand = {
    str match {
      case Fund(dateStr, tgtAcct, balanceStr) => FundCommand(parseDate(dateStr), AccountId(tgtAcct), Balance.parse(balanceStr), None)
    }
  }


}