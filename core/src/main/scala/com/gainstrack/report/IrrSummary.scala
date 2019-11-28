package com.gainstrack.report

import com.gainstrack.command._
import com.gainstrack.core._

case class IrrSummary(accounts: Map[AccountId, AccountInvestmentReport]) {
  def toSummaryDTO = {
    accounts.keys.toSeq.sorted.map(acctId => {
      val one = accounts(acctId)
      IrrSummaryItemDTO(acctId.toString, one.endBalance.toString, one.cashflows.headOption.map(_.date.toString).getOrElse(""),
        one.cashflows.lastOption.map(_.date.toString).getOrElse(""),
        one.irr
      )
    })
  }
}

case class IrrSummaryItemDTO(accountId: String, balance:String, start:String, end: String, irr:Double)

object IrrSummary {

  def apply(commands:Seq[AccountCommand], fromDate:LocalDate, queryDate:LocalDate, acctState: AccountState, balanceState: BalanceState, txState:TransactionState, priceState:PriceState, assetChainMap: AssetChainMap) : IrrSummary = {
    val assetClasses = Seq("ISA","Property", "Investment", "Pension")

    val test = (acctId:AccountId) => {assetClasses.foldLeft(false)((bool:Boolean,str:String) => bool || acctId.isSubAccountOf(AccountId("Assets:"+str)))}

    val invs = commands.filter(cmd => cmd match {
      case ac : AccountCreation => test(ac.accountId)
      case _ => false
    })

    val invAccts = invs.map(_.asInstanceOf[AccountCreation])

    val ret = invAccts.map(account => {
      val accountId = account.accountId
      val ccy = account.key.assetId
      val accountReport = new AccountInvestmentReport(accountId, ccy, fromDate, queryDate, acctState, balanceState, txState, priceState, assetChainMap)
      accountId ->accountReport

    }).toMap
    IrrSummary(ret)
  }
}
