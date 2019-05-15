package com.gainstrack.command

import com.gainstrack.core._

case class EarnCommand(date:LocalDate, incomeTag:String, value:Balance, targetAccountIdOpt:Option[AccountId] = None) extends AccountCommand {
  val incomeAccountId = AccountId(s"Income:${incomeTag}:${value.ccy.symbol}")

  override def description: String = s"Earn ${value} ${incomeTag}"

  // Leave as not implemented because we actually need to sub this out mid generation to a Transfer command
  override def mainAccounts: Set[AccountId] = ???

  override def involvedAccounts: Set[AccountId] = ???

  def toTransfer(accts:Set[AccountCreation]) : Transfer = {
    val incomeAccount = accts.find(_.accountId == incomeAccountId).getOrElse(throw new IllegalStateException(s"Income account ${incomeAccountId} is not defined"))

    val targetAccountId = targetAccountIdOpt.getOrElse(
      incomeAccount.options.fundingAccount.getOrElse(throw new IllegalStateException(s"Cannot earn from ${incomeAccount} without a fundingAccount option specified in its creation"))
    )
    val targetAccount = accts.find(_.accountId == targetAccountId).getOrElse(throw new IllegalStateException(s"Target account ${targetAccountId} does not exist"))
    // Multi-asset accounts have a dedicated sub funding account
    val targetFundingAccountId = if (targetAccount.options.multiAsset) targetAccountId.subAccount(value.ccy.symbol) else targetAccountId
    Transfer(incomeAccountId, targetFundingAccountId, date, value, value, description)
  }
}

object EarnCommand extends CommandParser {

  import Patterns._
  val prefix: String = "earn"
  private val Earning = s"${datePattern} earn $acctPattern $acctPattern $balanceMatch".r
  private val SimpleEarning = s"${datePattern} earn $acctPattern $balanceMatch".r


  override def parse(str: String): AccountCommand = {
    str match {
      case Earning(date, incomeTag, tgtAcct, value) =>
        EarnCommand(parseDate(date), incomeTag, value, Some(AccountId(tgtAcct)) )
      case SimpleEarning(date, incomeTag, value) =>
        EarnCommand(parseDate(date), incomeTag, value, None)
    }
  }
}