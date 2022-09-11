package com.gainstrack.command

import com.gainstrack.core._

/** Generates postings based on costs for money transfers */
case class Transfer(
                     source: AccountId,
                     dest: AccountId,
                     date: LocalDate,
                     sourceValue: Amount,
                     targetValue: Amount,
                     description:String, // Might be redundant with comments?
                     comments: Seq[String] = Seq()
                   ) extends CommandNeedsAccounts {
  def accountId : AccountId = source // Source is where the action was triggered!
  override def commandString: String = Transfer.prefix
  override def mainAccount: Option[AccountId] = Some(source)
  override def involvedAccounts: Set[AccountId] = Set(source, dest)

  if (sourceValue.ccy == targetValue.ccy) {
    require(sourceValue.number == targetValue.number, "Single transfer amount must match (until fees supported")
  }

  def fxRate:Fraction = {
    targetValue.number/sourceValue.number
  }

  def targetAccountId(accounts: Set[AccountCreation]): AccountId = {
    val targetAccount = accounts.find(_.accountId == dest).getOrElse(throw new IllegalStateException(s"${dest} target account does not exist"))
    val targetFundingAccountId = if (targetAccount.options.multiAsset) dest.subAccount(targetValue.ccy.symbol) else dest
    targetFundingAccountId
  }

  // FIXME: This is a slightly confusing method to have!!! Fund usages to see the danger
  // Consider separate Transfer and Transferred classes?
  override def toTransfers(accounts: Set[AccountCreation]): Seq[Transfer] = {
    val targetAccount = accounts.find(_.accountId == dest).getOrElse(throw new IllegalStateException(s"${dest} dest account does not exist"))
    val sourceAccount = accounts.find(_.accountId == source).getOrElse(throw new IllegalStateException(s"${source} source account does not exist"))
    // Multi-asset accounts have a dedicated sub funding account
    val sourceAccountId = if (sourceAccount.options.multiAsset) source.subAccount(sourceValue.ccy.symbol) else source
    val targetFundingAccountId = targetAccountId(accounts)
    val tfr = this.copy(source = sourceAccountId, dest = targetFundingAccountId)

    // Automatic reinvestment accounts don't hold Cash
    if (targetAccount.key.assetId == targetValue.ccy && targetAccount.options.automaticReinvestment) {
      require(targetAccount.options.multiAsset, s"${targetAccount.accountId} must be multiAsset to have automaticReinvestment")
      // Add another transfer out of cash into negative income
      val tfrOut = Transfer(targetFundingAccountId, targetFundingAccountId.convertType(Income), date, targetValue, targetValue, description)
      Seq(tfr, tfrOut)
    }
    else {
      Seq(tfr)
    }
  }

  def toTransaction : Transaction = {
    Transaction(date, description, Seq(
      Posting(source, -sourceValue),
      Posting(dest, targetValue, Amount(1/fxRate,sourceValue.ccy))
    ), this)

//  def toTransaction : Transaction = {
//    Transaction(date, description, Seq(
//      Posting(source, -sourceValue, Balance(fxRate,targetValue.ccy)),
//      Posting(dest, targetValue)
//    ), this)
  }

  def price : Amount = {
    Amount(fxRate, sourceValue.ccy)
  }

  override def toGainstrack: Seq[String] = {
    val baseStr = s"${date} tfr ${source.toGainstrack} ${dest.toGainstrack} ${sourceValue}"
    Seq(baseStr + (if(sourceValue==targetValue) "" else s" ${targetValue}"))
  }

  override def toPartialDTO: AccountCommandDTO = {
    AccountCommandDTO(accountId = accountId, date = date, change = Some(sourceValue), price = Some(price), otherAccount = Some(dest))
  }
  override def withComments(newComments: Seq[String]): AccountCommand = {
    copy(comments = newComments)
  }
}

object Transfer extends CommandParser {
  import Patterns._

  val prefix = "tfr"
  private val balanceRe = raw"(\S+ \S+)"
  private val FxTransfer =s"${datePattern} ${prefix} ${acctPattern} ${acctPattern} ${balanceRe} ${balanceRe}".r
  private val SimpleTransfer = s"${datePattern} ${prefix} ${acctPattern} ${acctPattern} ${balanceRe}".r

  def apply(source:AccountId, dest:AccountId, date:LocalDate, sourceValue:Amount, targetValue:Amount ):Transfer = {
    require(targetValue.number != zeroFraction)
    require(sourceValue.number != zeroFraction)
    val fxRate = targetValue.number/sourceValue.number
    val fxDescription = if (sourceValue.ccy == targetValue.ccy) "" else s"@${(1/fxRate.toDouble).formatted("%.6f")}"
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