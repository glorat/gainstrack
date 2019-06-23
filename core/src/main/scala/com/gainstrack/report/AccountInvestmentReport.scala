package com.gainstrack.report

import com.gainstrack.core._

class AccountInvestmentReport(accountId: AccountId, ccy:AssetId, queryDate: LocalDate, acctState:AccountState, balanceState:BalanceState, txState:TransactionState, priceState: PriceState) {
  val fromDate:LocalDate = parseDate("1980-01-01")

  val account = acctState.accountMap(accountId)

  val cmds = txState.cmds.filter(cmd => cmd.origin.date.isAfter(fromDate) && cmd.origin.date.isBefore(queryDate) )
  val inflows = new InflowCalculator(cmds).calcInflows(accountId)

  // Include Income/Expenses relating to the asset
  //val income = new InflowCalculator(txState).calcInflows(accountId.replace("Asset:","Income:"))
  // Where can that income go? Assume to bank accounts etc. for now?
  // TODO: Be careful about income (e.g dividends) that go straight back to investment! (i.e. self asset)
  val income : Seq[Cashflow] = account.options.incomeAccount.map(incomeAccountId => {
    val incomeFlow = new InflowCalculator(cmds)
      .calcInflows(incomeAccountId)
    incomeFlow
  }).getOrElse(Seq())

  // Take just the final equity balance as positive
  val allAccounts = acctState.accounts.filter(a => a.accountId.isSubAccountOf(accountId))
  val initBalance = Balance(zeroFraction, ccy)

  val startBalance: Balance = allAccounts.foldLeft(initBalance)((total, account) => {
    val b = balanceState.getBalance(account.accountId, fromDate).getOrElse(zeroFraction)
    // FX this into parent ccy
    val fx = priceState.getFX(AssetTuple(account.key.assetId, ccy), fromDate).getOrElse(throw new Exception(s"Missing FX for ${account.key.assetId.symbol}/${ccy.symbol}"))
    // Make start balance negative as outflow
    // The -0.001 is to workaround some XIRR glitch
    -(total + b * fx)
  })

  val endBalance: Balance = allAccounts.foldLeft(initBalance)((total, account) => {
    val b = balanceState.getBalance(account.accountId, queryDate).getOrElse(zeroFraction)
    // FX this into parent ccy
    val fx = priceState.getFX(AssetTuple(account.key.assetId, ccy), queryDate).getOrElse(throw new Exception(s"Missing FX for ${account.key.assetId.symbol}/${ccy.symbol}"))
    total + b * fx
  })

  val cashflows = (Cashflow(fromDate, startBalance) +: inflows) ++ income :+ Cashflow(queryDate, endBalance)
  val cashflowTable = CashflowTable(cashflows)

}
