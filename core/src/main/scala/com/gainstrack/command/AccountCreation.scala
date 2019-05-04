package com.gainstrack.command

import com.gainstrack.core._

case class AccountOptions (
                          expenseAccount:Option[String] = None,
                          tradingAccount: Boolean = false,
                          incomeAccount:Option[String] = None,
                          description:String = "",
                          assetNonStdScu:Option[Int] = None,
                          hidden:Boolean = false,
                          placeholder:Boolean = false
                          )

case class AccountCreation (
                           date: LocalDate,
                           key: AccountKey,
                           options:AccountOptions
                           ) extends AccountCommand with BeancountCommand {
  override def origin: AccountCommand = this
  def accountId = key.name
  def name = key.name

  override def description: String = "Account opened"
  override def mainAccounts: Set[AccountId] = Set(accountId)
  override def involvedAccounts: Set[AccountId] = Set(accountId)

  def parentAccountId:Option[AccountId] = {
    val idx = key.name.lastIndexOf(":")
    if (idx>0) {
      Some(key.name.take(idx-1))
    }
    else {
      None
    }
  }

  def enableTrading(incomeAccountId:AccountId) : AccountCreation = {
    copy(options = options.copy(tradingAccount = true, incomeAccount=Some(incomeAccountId)))
  }

  def toBeancount : String = {
    val open = s"${date} open ${key.name} ${key.assetId.symbol}"
    if (options.tradingAccount) {
      open + "\nplugin \"beancount.plugins.book_conversions\" " +
        s""""${accountId},${options.incomeAccount.get}""""
    }
    else {
      open
    }
  }

  override def toString: String = toBeancount

  override def withOption(key:String, valueStr:String) : AccountCreation = {
    key match {
      case "expenseAccount" => copy(options = options.copy(expenseAccount =  Some(valueStr)))
      case "incomeAccount" => copy(options = options.copy(incomeAccount =  Some(valueStr)))
      case _ => this
    }
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