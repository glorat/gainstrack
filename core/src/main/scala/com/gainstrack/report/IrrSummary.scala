package com.gainstrack.report

import com.gainstrack.command._
import com.gainstrack.core._

case class IrrSummary(accounts: Map[AccountId, AccountInvestmentReport])
object IrrSummary {

  def apply(commands:Seq[AccountCommand], queryDate:LocalDate, acctState: AccountState, balanceState: BalanceState, txState:TransactionState, priceState:PriceState) : IrrSummary = {
    val assetClasses = Seq("Bank","ISA","Property", "Investment")

    // FIXME: Avoid AccountId string manip
    val test = (acctId:AccountId) => {assetClasses.foldLeft(false)((bool:Boolean,str:String) => bool || acctId.isSubAccountOf(AccountId("Assets:"+str)))}

    val invs = commands.filter(cmd => cmd match {
      case ac : AccountCreation => test(ac.accountId)
      case _ => false
    })

    val invAccts = invs.map(_.asInstanceOf[AccountCreation])

    val ret = invAccts.map(account => {
      val accountId = account.accountId
      val ccy = account.key.assetId
      val accountReport = new AccountInvestmentReport(accountId, ccy, queryDate, acctState, balanceState, txState, priceState)
      accountId ->accountReport

    }).toMap
    IrrSummary(ret)
  }
}
