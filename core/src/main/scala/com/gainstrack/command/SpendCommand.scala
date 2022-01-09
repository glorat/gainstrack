package com.gainstrack.command

import com.gainstrack.core._

case class SpendCommand(date:LocalDate, expenseTag:String, value:Amount, otherAccountIdOpt:Option[AccountId] = None) extends CommandNeedsAccounts {
  val mainIncomeAccountId = if (expenseTag.startsWith("Expenses:")) AccountId(expenseTag) else AccountId(s"Expenses:${expenseTag}")

  // private val incomeAccountId = AccountId(s"${mainIncomeAccountId}:${value.ccy.symbol}")

  override def commandString: String = SpendCommand.prefix

  override def description: String = s"Spend ${value} ${expenseTag}"

  override def mainAccount: Option[AccountId] = Some(mainIncomeAccountId)

  // Leave as not implemented because we actually need to sub this out mid generation to a Transfer command
  override def involvedAccounts: Set[AccountId] = ???

  def toTransfers(accts:Set[AccountCreation]) : Seq[Transfer] = {
    val expenseAccount = accts.find(_.accountId == mainIncomeAccountId)
      .orElse(accts.find(_.accountId == mainIncomeAccountId.subAccount(value.ccy.symbol)))
      .getOrElse(throw new IllegalStateException(s"Expense account ${mainIncomeAccountId} is not defined"))

    val sourceAccountId = otherAccountIdOpt.getOrElse(
      expenseAccount.options.fundingAccount.getOrElse(throw new IllegalStateException(s"Cannot spend from ${expenseAccount} without a fundingAccount option specified in its creation"))
    )
    val sourceAccount = accts.find(_.accountId == sourceAccountId).getOrElse(throw new IllegalStateException(s"Target account ${sourceAccountId} does not exist"))

    // The Transfer.toTransfers looks weird but is needed to ensure multiAsset account works
    Transfer(sourceAccountId, expenseAccount.accountId, date, value, value, description).toTransfers(accts)
  }

  def toGainstrack: Seq[String] = {
    if (otherAccountIdOpt.isDefined) {
      Seq(s"${date} spend ${expenseTag} ${otherAccountIdOpt.get.toGainstrack} ${value}")
    }
    else {
      Seq(s"${date} spend ${expenseTag} ${value}")
    }
  }

  override def toPartialDTO: AccountCommandDTO = {
    AccountCommandDTO(accountId = mainIncomeAccountId, date = date, change = Some(value), otherAccount = otherAccountIdOpt)
  }
}

object SpendCommand extends CommandParser {

  import Patterns._
  val prefix: String = "spend"
  private val Spending = s"${datePattern} ${prefix} $acctPattern $acctPattern $balanceMatch".r
  private val SimpleSpending = s"${datePattern} ${prefix} $acctPattern $balanceMatch".r


  override def parse(str: String): AccountCommand = {
    str match {
      case Spending(date, expenseTag, otherAcct, value) =>
        SpendCommand(parseDate(date), expenseTag, value, Some(AccountId(otherAcct)) )
      case SimpleSpending(date, expenseTag, value) =>
        SpendCommand(parseDate(date), expenseTag, value, None)
    }
  }
}