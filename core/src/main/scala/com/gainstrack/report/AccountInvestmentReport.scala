package com.gainstrack.report

import com.gainstrack.core._

class AccountInvestmentReport(accountId: AccountId, ccy:AssetId, queryDate: LocalDate, acctState:AccountState, balanceState:BalanceState, txState:TransactionState, priceState: PriceState) {
  val account = acctState.accountMap(accountId)

  val inflows = new InflowCalculator(txState).calcInflows(accountId)

  // Include Income/Expenses relating to the asset
  //val income = new InflowCalculator(txState).calcInflows(accountId.replace("Asset:","Income:"))
  // Where can that income go? Assume to bank accounts etc. for now?
  // TODO: Be careful about income (e.g dividends) that go straight back to investment! (i.e. self asset)
  val income : Seq[Cashflow] = account.options.incomeAccount.map(incomeAccountId => {
    val incomeFlow = new InflowCalculator(txState)
      .calcInflows(incomeAccountId)
    incomeFlow
  }).getOrElse(Seq())

  // Take just the final equity balance as positive
  val allAccounts = acctState.accounts.filter(a => a.accountId.isSubAccountOf(accountId))
  val initBalance = Balance(zeroFraction, ccy)

  val balance: Balance = allAccounts.foldLeft(initBalance)((total, account) => {
    val b = balanceState.getBalance(account.accountId, queryDate).getOrElse(zeroFraction)
    // FX this into parent ccy
    val fx = priceState.getFX(AssetTuple(account.key.assetId, ccy), queryDate).getOrElse(throw new Exception(s"Missing FX for ${account.key.assetId.symbol}/${ccy.symbol}"))
    total + b * fx
  })

  val cashflows = inflows ++ income :+ Cashflow(queryDate, balance)
  val cashflowTable = CashflowTable(cashflows)

}
