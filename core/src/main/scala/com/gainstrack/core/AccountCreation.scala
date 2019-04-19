package com.gainstrack.core

case class AccountOptions (
                          expenseAccount:Option[String] = None,
                          description:String = "",
                          assetNonStdScu:Option[Int] = None,
                          hidden:Boolean = false,
                          placeholder:Boolean = false
                          )

case class AccountCreation (
                           date: LocalDate,
                           key: AccountKey,
                           options:AccountOptions
                           ) extends AccountCommand {
  def accountId = key.name
  def name = key.name

  def toBeancount : String = {
    s"${date} open ${key.name} ${key.assetId.symbol}"
  }

  override def toString: String = toBeancount

  override def withOption(key:String, valueStr:String) : AccountCreation = {
    key match {
      case "expenseAccount" => copy(options = options.copy(expenseAccount =  Some(valueStr)))
      case _ => this
    }
  }
}

object AccountCreation extends CommandParser {
  import Patterns._

  val prefix = "open"
  private val re =s"${datePattern} ${prefix} ${acctPattern} (\\S+)".r

  override def parse(str: String): AccountCreation = {
    str match {
      case re(date, acct, ccy) => AccountCreation(parseDate(date), AccountKey(acct, AssetId(ccy)))
    }
  }

  def apply(date:LocalDate, key:AccountKey) : AccountCreation = AccountCreation(date, key, AccountOptions())
}