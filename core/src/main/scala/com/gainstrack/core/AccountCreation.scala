package com.gainstrack.core

case class AccountCreation (
                           date: LocalDate,
                           key: AccountKey,
                             assetNonStdScu: Option[Int],
                             code:String,
                             description:String,
                             hidden: Boolean,
                             placeholder: Boolean
                           ) extends AccountCommand {
  def accountId = key.name

  def toBeancount : String = {
    s"${date} open ${key.name} ${key.assetId.symbol}"
  }

  override def toString: String = toBeancount
}

object AccountCreation extends CommandParser {
  import Patterns._

  val prefix = "open"
  private val re =s"${datePattern} ${prefix} ${acctPattern} (\\S+)".r

  override def parse(str: String): AccountCreation = {
    str match {
      case re(date, acct, ccy) => AccountCreation(parseDate(date), AccountKey(acct, AssetId(ccy)), None,"","",false,false)
    }
  }
}