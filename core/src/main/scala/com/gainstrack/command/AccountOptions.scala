package com.gainstrack.command

import com.gainstrack.core.AccountId

case class AccountOptions (
                          expenseAccount:Option[AccountId] = None,
                          tradingAccount: Boolean = false,
                          incomeAccount:Option[AccountId] = None,
                          fundingAccount:Option[AccountId] = None,
                          description:String = "",
                          multiAsset:Boolean=false,
                          automaticReinvestment:Boolean=false,
                          generatedAccount:Boolean = false,
                          assetNonStdScu:Option[Int] = None,
                          hidden:Boolean = false,
                          placeholder:Boolean = false
                          ) extends CommandOptions {

  def withOption(key:String, valueStr:String) : AccountOptions = {
    key match {
      case "expenseAccount" => copy(expenseAccount = Some(AccountId(valueStr)))
      case "incomeAccount" => copy(incomeAccount = Some(AccountId(valueStr)))
      case "fundingAccount" => copy(fundingAccount = Some(AccountId(valueStr)))
      case "multiAsset" => copy(multiAsset = stringToBool(valueStr) )
      case "automaticReinvestment" => copy(automaticReinvestment = stringToBool(valueStr) )
      case _ => throw new IllegalArgumentException(s"Unknown account option: ${key}")
    }
  }

  def toGainstrack:Seq[String] = {
    acctStr("expenseAccount", expenseAccount) ++
      boolStr("tradingAccount", tradingAccount) ++
      acctStr("incomeAccount", incomeAccount) ++
      acctStr("fundingAccount", fundingAccount) ++
      boolStr("multiAsset", multiAsset) ++
      boolStr("automaticReinvestment", automaticReinvestment) ++
      boolStr("hidden", hidden) ++
      boolStr("placeholder", placeholder)
    }
}
