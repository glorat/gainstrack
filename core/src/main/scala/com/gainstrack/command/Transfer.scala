package com.gainstrack.command

import com.gainstrack.core._

/** Generates postings based on costs for money transfers */
case class Transfer(
                     source: AccountId,
                     dest: AccountId,
                     date: LocalDate,
                     sourceValue: Balance,
                     targetValue: Balance,
                     description:String
                   ) extends CommandNeedsAccounts {
  def accountId : AccountId = source // Source is where the action was triggered!
  override def mainAccount: Option[AccountId] = Some(source)
  override def involvedAccounts: Set[AccountId] = Set(source, dest)

  if (sourceValue.ccy == targetValue.ccy) {
    require(sourceValue.value == targetValue.value, "Single transfer amount must match (until fees supported")
  }

  def fxRate:Fraction = {
    targetValue.value/sourceValue.value
  }

  // FIXME: This is a slightly confusing method to have!!! Fund usages to see the danger
  override def toTransfers(accounts: Set[AccountCreation]): Seq[Transfer] = {
    val targetAccount = accounts.find(_.accountId == dest).get

    // Multi-asset accounts have a dedicated sub funding account
    val targetFundingAccountId = if (targetAccount.options.multiAsset) dest.subAccount(targetValue.ccy.symbol) else dest
    val tfr = this.copy(dest = targetFundingAccountId)
    Seq(tfr)
  }

  def toTransaction : Transaction = {
    Transaction(date, description, Seq(
      Posting(source, -sourceValue, Balance(fxRate,targetValue.ccy)),
      Posting(dest, targetValue)
    ), this)
  }

}

object Transfer extends CommandParser {
  import Patterns._

  val prefix = "tfr"
  private val balanceRe = raw"(\S+ \S+)"
  private val FxTransfer =s"${datePattern} ${prefix} ${acctPattern} ${acctPattern} ${balanceRe} ${balanceRe}".r
  private val SimpleTransfer = s"${datePattern} ${prefix} ${acctPattern} ${acctPattern} ${balanceRe}".r

  def apply(source:AccountId, dest:AccountId, date:LocalDate, sourceValue:Balance, targetValue:Balance ):Transfer = {
    require(targetValue.value != zeroFraction)
    require(sourceValue.value != zeroFraction)
    val fxRate = targetValue.value/sourceValue.value
    val fxDescription = if (sourceValue.ccy == targetValue.ccy) "" else s"@${1/fxRate.toDouble}"
    val description:String = s"Transfer ${sourceValue} ${source} -> ${dest}" + fxDescription
    Transfer(source, dest, date, sourceValue, targetValue, description)
  }

  override def parse(str: String): Transfer = {
    str match {
      case FxTransfer(date, srcAcct, tgtAcct, srcValue, tgtValue) =>
        Transfer(AccountId(srcAcct), AccountId(tgtAcct), parseDate(date), srcValue, tgtValue)
      case SimpleTransfer(date, srcAcct, tgtAcct, value) =>
        Transfer(AccountId(srcAcct), AccountId(tgtAcct), parseDate(date), value, value)
    }
  }
}