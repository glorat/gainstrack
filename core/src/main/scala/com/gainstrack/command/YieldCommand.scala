package com.gainstrack.command

import com.gainstrack.core._

case class YieldCommand(date:LocalDate, assetAccountId:AccountId, value:Balance, targetAccountIdOpt:Option[AccountId] = None) extends CommandNeedsAccounts {
  val incomeAccountId = assetAccountId.convertType(Income)

  override def description: String = s"${assetAccountId} yield ${value}"

  // Leave as not implemented because we actually need to sub this out mid generation to a Transfer command
  override def mainAccounts: Set[AccountId] = ???

  override def involvedAccounts: Set[AccountId] = ???

  def createRequiredAccounts(baseAcct:AccountCreation) : Seq[AccountCreation] = {
    require(baseAcct.accountId == assetAccountId)
    val incomeAcct = baseAcct.copy(key = AccountKey(incomeAccountId, value.ccy), options = baseAcct.options.copy(multiAsset = false))
    Seq(incomeAcct)
  }

  def toTransfers(accts:Set[AccountCreation]) : Seq[Transfer] = {
    val assetAccount = accts.find(_.accountId == assetAccountId).getOrElse(throw new IllegalStateException(s"Asset account ${assetAccountId} is not defined"))

    val targetAccountId = targetAccountIdOpt.getOrElse(
      assetAccount.options.fundingAccount.getOrElse(assetAccountId)
    )
    val targetAccount = accts.find(_.accountId == targetAccountId).getOrElse(throw new IllegalStateException(s"Target account ${targetAccountId} does not exist"))
    // Multi-asset accounts have a dedicated sub funding account
    val targetIncomeAccountId = if (targetAccount.options.multiAsset) targetAccountId.subAccount(value.ccy.symbol) else targetAccountId
    Seq(Transfer(incomeAccountId, targetIncomeAccountId, date, value, value, description))
  }
}

object YieldCommand extends CommandParser {

  import Patterns._
  val prefix: String = "yield"
  private val Yield = s"${datePattern} yield $acctPattern $acctPattern $balanceMatch".r
  private val SimpleYield = s"${datePattern} yield $acctPattern $balanceMatch".r


  override def parse(str: String): AccountCommand = {
    str match {
      case Yield(date, incomeTag, tgtAcct, value) =>
        YieldCommand(parseDate(date), incomeTag, value, Some(AccountId(tgtAcct)) )
      case SimpleYield(date, incomeTag, value) =>
        YieldCommand(parseDate(date), incomeTag, value, None)
    }
  }
}