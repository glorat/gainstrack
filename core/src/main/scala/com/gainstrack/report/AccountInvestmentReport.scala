package com.gainstrack.report

import com.gainstrack.core._

class AccountInvestmentReport(accountId: AccountId, ccy:AssetId, fromDate:LocalDate, queryDate: LocalDate, acctState:AccountState, balanceState:BalanceState, txState:TransactionState, priceState: PriceState) {
  val account = acctState.accountMap(accountId)

  val cmds = txState.cmds.filter(cmd => cmd.origin.date.isAfter(fromDate) && cmd.origin.date.isBefore(queryDate) )
  val inflows = new InflowCalculator(cmds).calcInflows(accountId)

  // Take just the final equity balance as positive
  val allAccounts = acctState.accounts.filter(a => a.accountId.isSubAccountOf(accountId))
  val initBalance = Balance(zeroFraction, ccy)

  val startBalance: Balance = allAccounts.foldLeft(initBalance)((total, account) => {
    val b = balanceState.getAccountValue(account.accountId, fromDate)
    // FX this into parent ccy
    val fx = priceState.getFX(AssetPair(account.key.assetId, ccy), fromDate).getOrElse(throw new Exception(s"Missing FX for ${account.key.assetId.symbol}/${ccy.symbol}"))
    // Make start balance negative as outflow
    // The -0.001 is to workaround some XIRR glitch
    -(total + b * fx)
  })

  val endBalance: Balance = allAccounts.foldLeft(initBalance)((total, account) => {
    val b = balanceState.getAccountValue(account.accountId, queryDate)
    // FX this into parent ccy
    val fx = priceState.getFX(AssetPair(account.key.assetId, ccy), queryDate).getOrElse(throw new Exception(s"Missing FX for ${account.key.assetId.symbol}/${ccy.symbol}"))
    total + b * fx
  })

  val cashflows = (Cashflow(fromDate, startBalance, accountId) +: inflows) :+ Cashflow(queryDate, endBalance, accountId)
  val cashflowTable = CashflowTable(cashflows)

}
