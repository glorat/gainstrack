package com.gainstrack.core

class AccountReport(accountId: AccountId, ccy:AssetId, queryDate: LocalDate, bg:BeancountGenerator, priceCollector: PriceCollector) {

  // TODO: Get this from accounts
  // Find all inflows from Asset/Equity accounts as negative
  val inflows = new InflowCalculator(bg).calcInflows(accountId)

  // Take just the final equity balance as positive
  val allAccounts = bg.acctState.accounts.filter(a => a.accountId.startsWith(accountId))
  val initBalance = Balance(zeroFraction, ccy)

  val balance: Balance = allAccounts.foldLeft(initBalance)((total, account) => {
    val b = bg.balanceState.getBalance(account.accountId, queryDate).getOrElse(zeroFraction)
    // FX this into parent ccy
    val fx = priceCollector.getState.getFX(AssetTuple(account.key.assetId, ccy), queryDate).getOrElse(throw new Exception(s"Missing FX for ${account.key.assetId.symbol}/${ccy.symbol}"))
    total + b * fx
  })

  val cashflows = inflows :+ Cashflow(queryDate, balance)
  val cashflowTable = CashflowTable(cashflows)

}
