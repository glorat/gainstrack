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
                   ) extends AccountCommand {
  def accountId : AccountId = source // Source is where the action was triggered!
  override def mainAccounts: Set[AccountId] = Set(source, dest)
  override def involvedAccounts: Set[AccountId] = Set(source, dest)

  if (sourceValue.ccy == targetValue.ccy) {
    require(sourceValue.value == targetValue.value, "Single transfer amount must match (until fees supported")
  }

  def fxRate:Fraction = {
    targetValue.value/sourceValue.value
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

  private val Earning = s"${datePattern} earn ${acctPattern} $acctPattern $balanceRe".r

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
      case Earning(date, tgtAcct, incomeTag, value) =>
        earning(AccountId(tgtAcct), incomeTag, parseDate(date), value)
    }
  }

  def earning(assetAccountId:AccountId, incomeTag:String, date:LocalDate, sourceValue:Balance):Transfer = {
    // TODO: Restrict the account types that can be used here
    val srcAcct = s"Income:${incomeTag}:${sourceValue.ccy.symbol}"
    val description = s"$incomeTag Income of $sourceValue"
    Transfer(AccountId(srcAcct), assetAccountId, date, sourceValue, sourceValue, description)
  }
}