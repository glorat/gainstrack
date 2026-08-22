package com.gainstrack.command

import com.gainstrack.core._

// The account is held RESOLVED, never as the bare tag the source may have used, so that
// `toGainstrack` round-trips to an equal command (asserted by First and TransactionBalance).
// `EarnCommand.parse` is the only constructor; it does the qualifying.
case class EarnCommand(date:LocalDate, incomeAccountId:AccountId, value:Amount, targetAccountIdOpt:Option[AccountId] = None, comments:Seq[String] = Seq()) extends CommandNeedsAccounts {
  require(incomeAccountId.accountType == Income, s"${incomeAccountId} is not an Income account")

  val mainIncomeAccountId: AccountId = incomeAccountId


  // private val incomeAccountId = AccountId(s"${mainIncomeAccountId}:${value.ccy.symbol}")

  override def commandString: String = EarnCommand.prefix

  override def description: String = s"Earn ${value} ${incomeAccountId}"

  override def mainAccount: Option[AccountId] = Some(mainIncomeAccountId)

  // Leave as not implemented because we actually need to sub this out mid generation to a Transfer command
  override def involvedAccounts: Set[AccountId] = ???

  def toTransfers(accts:Set[AccountCreation]) : Seq[Transfer] = {
    val incomeAccount = accts.find(_.accountId == mainIncomeAccountId)
      .orElse(accts.find(_.accountId == mainIncomeAccountId.subAccount(value.ccy.symbol)))
      .getOrElse(throw new IllegalStateException(s"Income account ${mainIncomeAccountId} is not defined"))

    val targetAccountId = targetAccountIdOpt.getOrElse(
      incomeAccount.options.fundingAccount.getOrElse(throw new IllegalStateException(s"Cannot earn from ${incomeAccount} without a fundingAccount option specified in its creation"))
    )
    val targetAccount = accts.find(_.accountId == targetAccountId).getOrElse(throw new IllegalStateException(s"Target account ${targetAccountId} does not exist"))
    // The Transfer.toTransfers looks weird but is needed to ensure multiAsset account works

    Transfer(incomeAccount.accountId, targetAccountId, date, value, value, description).toTransfers(accts)
  }

  def toGainstrack: Seq[String] = {
    if (targetAccountIdOpt.isDefined) {
      Seq(s"${date} earn ${incomeAccountId.toGainstrack} ${targetAccountIdOpt.get.toGainstrack} ${value}")
    }
    else {
      Seq(s"${date} earn ${incomeAccountId.toGainstrack} ${value}")
    }
  }

  override def toPartialDTO: AccountCommandDTO = {
    AccountCommandDTO(accountId = mainIncomeAccountId, date = date, change = Some(value), otherAccount = targetAccountIdOpt)
  }

  /** Commands should write
   * this.copy(comments = newComments)
   * */
  override def withComments(newComments: Seq[String]): AccountCommand = {
    copy(comments = newComments)
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
        EarnCommand(parseDate(date), qualifiedAccount(incomeTag, Income), value, Some(AccountId(tgtAcct)) )
      case SimpleEarning(date, incomeTag, value) =>
        EarnCommand(parseDate(date), qualifiedAccount(incomeTag, Income), value, None)
    }
  }
}