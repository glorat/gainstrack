package com.gainstrack.core

class AccountReport(accountId: AccountId, ccy:AssetId, queryDate: LocalDate, bg:BeancountGenerator, priceCollector: PriceCollector) {
  val account = bg.acctState.accountMap(accountId)

  // TODO: Get this from accounts
  // Find all inflows from Asset/Equity/Liabilities. Should be negative
  val inflows = new InflowCalculator(bg,  Set(Equity, Assets, Liabilities), -1).calcInflows(accountId)
  // Include Income/Expenses relating to the asset
  //val income = new InflowCalculator(bg).calcInflows(accountId.replace("Asset:","Income:"))
  // Where can that income go? Assume to bank accounts etc. for now?
  // TODO: Be careful about income (e.g dividends) that go straight back to investment! (i.e. self asset)
  val income : Seq[Cashflow] = account.options.incomeAccount.map(incomeAccountId => {
    val incomeFlow = new InflowCalculator(bg, Set(Equity,Assets,Liabilities), -1)
      .calcInflows(incomeAccountId)
    incomeFlow
  }).getOrElse(Seq())

  // Take just the final equity balance as positive
  val allAccounts = bg.acctState.accounts.filter(a => isSubAccountOf(a.accountId, accountId))
  val initBalance = Balance(zeroFraction, ccy)

  val balance: Balance = allAccounts.foldLeft(initBalance)((total, account) => {
    val b = bg.balanceState.getBalance(account.accountId, queryDate).getOrElse(zeroFraction)
    // FX this into parent ccy
    val fx = priceCollector.getState.getFX(AssetTuple(account.key.assetId, ccy), queryDate).getOrElse(throw new Exception(s"Missing FX for ${account.key.assetId.symbol}/${ccy.symbol}"))
    total + b * fx
  })

  val cashflows = inflows ++ income :+ Cashflow(queryDate, balance)
  val cashflowTable = CashflowTable(cashflows)

}
