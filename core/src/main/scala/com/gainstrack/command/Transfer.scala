package com.gainstrack.command

import com.gainstrack.core._

/** Generates postings based on costs for money transfers */
case class Transfer(
                     source: AccountId,
                     dest: AccountId,
                     date: LocalDate,
                     sourceValue: Balance,
                     targetValue: Balance
                   ) extends AccountCommand {
  def accountId : AccountId = source // Source is where the action was triggered!
  override def mainAccounts: Set[AccountId] = Set(source, dest)
  override def involvedAccounts: Set[AccountId] = Set(source, dest)
  def fxDescription = if (sourceValue.ccy == targetValue.ccy) "" else s"@${1/fxRate.toDouble}"
  def description:String = s"Transfer ${sourceValue} ${source} -> ${dest}" + fxDescription

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

  override def parse(str: String): Transfer = {
    str match {
      case FxTransfer(date, srcAcct, tgtAcct, srcValue, tgtValue) =>
        Transfer(srcAcct, tgtAcct, parseDate(date), srcValue, tgtValue)
      case SimpleTransfer(date, srcAcct, tgtAcct, value) =>
        Transfer(srcAcct, tgtAcct, parseDate(date), value, value)
    }
  }
}