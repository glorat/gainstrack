package com.gainstrack.command

import com.gainstrack.core._

case class AccountOptions (
                          expenseAccount:Option[AccountId] = None,
                          tradingAccount: Boolean = false,
                          incomeAccount:Option[AccountId] = None,
                          fundingAccount:Option[AccountId] = None,
                          description:String = "",
                          multiAsset:Boolean=false,
                          automaticReinvestment:Boolean=false,
                          assetNonStdScu:Option[Int] = None,
                          hidden:Boolean = false,
                          placeholder:Boolean = false
                          ) {
  private def boolStr(name:String, value:Boolean) = {
    if (value) s"${name}:true\n" else ""
  }
  private def acctStr(name:String, value:Option[AccountId]) = {
    value.map(x => s"  ${name}: ${x.toGainstrack}\n").getOrElse("")
  }
  def toGainstrack:String = {
    acctStr("expenseAccount", expenseAccount) +
      boolStr("tradingAccount", tradingAccount) +
      acctStr("incomeAccount", incomeAccount) +
      acctStr("fundingAccount", fundingAccount) +
      boolStr("multiAsset", multiAsset) +
      boolStr("automaticReinvestment", automaticReinvestment) +
      boolStr("hidden", hidden) +
      boolStr("placeholder", placeholder)
    }
}

case class AccountCreation (
                           date: LocalDate,
                           key: AccountKey,
                           options:AccountOptions
                           ) extends AccountCommand with BeancountCommand {
  override def origin: AccountCommand = this
  def accountId = key.name
  def name = key.name

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

  def toGainstrack : String = {
    s"\n${date} open ${key.name} ${key.assetId.symbol}\n" + options.toGainstrack
  }

  private def stringToBool(valueStr:String):Boolean = valueStr!="false"

  //override def toString: String = s"${date} open ${key.name} ${key.assetId.symbol}"

  override def withOption(key:String, valueStr:String) : AccountCreation = {
    key match {
      case "expenseAccount" => copy(options = options.copy(expenseAccount = Some(AccountId(valueStr))))
      case "incomeAccount" => copy(options = options.copy(incomeAccount = Some(AccountId(valueStr))))
      case "fundingAccount" => copy(options = options.copy(fundingAccount = Some(AccountId(valueStr))))
      case "multiAsset" => copy(options = options.copy(multiAsset = stringToBool(valueStr) ))
      case "automaticReinvestment" => copy(options = options.copy(automaticReinvestment = stringToBool(valueStr) ))
      case _ => throw new IllegalArgumentException(s"Unknown account option: ${key}")
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