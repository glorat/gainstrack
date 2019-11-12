package com.gainstrack.command

import com.gainstrack.core._



case class AccountCreation (
                           date: LocalDate,
                           key: AccountKey,
                           options:AccountOptions
                           ) extends AccountCommand with BeancountCommand {
  override def origin: AccountCommand = this
  def accountId = key.name
  def name = key.name

  override def commandString: String = "open"
  override def description: String = "Account opened"
  override def mainAccount: Option[AccountId] = Some(accountId)
  override def involvedAccounts: Set[AccountId] = Set(accountId)

  def parentAccountId:Option[AccountId] = {
    key.name.parentAccountId
  }

  def enableTrading(incomeAccountId:AccountId, fundingAccountId:AccountId) : AccountCreation = {
    copy(options = options.copy(tradingAccount = true, multiAsset=false, incomeAccount=Some(incomeAccountId), fundingAccount=Some(fundingAccountId)))
  }

  def toBeancount : Seq[BeancountLine] = {
    val open = s"${date} open ${key.name} ${key.assetId.symbol}"
    if (options.tradingAccount) {
      val plugin = "plugin \"beancount.plugins.book_conversions\" " +
        s""""${accountId},${options.incomeAccount.get}""""
      BeancountLines(Seq(open, plugin), this)
    }
    else {
      BeancountLines(open, this)
    }
  }

  def toGainstrack : Seq[String] = {
    s"${date} open ${key.name} ${key.assetId.symbol}" +: options.toGainstrack
  }

  private def stringToBool(valueStr:String):Boolean = valueStr!="false"

  //override def toString: String = s"${date} open ${key.name} ${key.assetId.symbol}"

  override def withOption(key:String, valueStr:String) : AccountCreation = {
    copy (options = options.withOption(key, valueStr))
  }
}

object AccountCreation extends CommandParser {
  import com.gainstrack.command.Patterns._

  val prefix = "open"
  private val re =s"${datePattern} ${prefix} ${acctPattern} (\\S+)".r

  override def parse(str: String): AccountCreation = {
    str match {
      case re(date, acct, ccy) => AccountCreation(parseDate(date), AccountKey(acct, AssetId(ccy)))
    }
  }

  def apply(date:LocalDate, key:AccountKey) : AccountCreation = AccountCreation(date, key, AccountOptions())
}