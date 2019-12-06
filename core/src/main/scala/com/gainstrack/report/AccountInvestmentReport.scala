package com.gainstrack.report

import com.gainstrack.core._

class AccountInvestmentReport(accountId: AccountId, ccy:AssetId, fromDate:LocalDate, queryDate: LocalDate, acctState:AccountState, balanceState:BalanceState, txState:TransactionState, priceState: PriceState, assetChainMap: AssetChainMap) {
  val account = acctState.accountMap(accountId)


  val cmds = txState.cmds.filter(cmd => cmd.origin.date.isAfter(fromDate) && cmd.origin.date.isBefore(queryDate) )
  val inflows = new InflowCalculator(cmds).calcInflows(accountId)

  val firstDate = inflows.headOption.map(_.date).getOrElse(fromDate).minusDays(1)

  // Take just the final equity balance as positive
  val allAccounts = acctState.accounts.filter(a => a.accountId.isSubAccountOf(accountId))
  val initBalance = Amount(zeroFraction, ccy)

  val startBalance: Amount = allAccounts.foldLeft(initBalance)((total, account) => {
    val b = balanceState.getAccountValue(account.accountId, fromDate)
    // FX this into parent ccy
    val fx = priceState.getFX(AssetPair(account.key.assetId, ccy), firstDate).getOrElse(throw new Exception(s"Missing FX for ${account.key.assetId.symbol}/${ccy.symbol}"))
    -(total + b * fx)
  })

  val endBalance: Amount = allAccounts.foldLeft(initBalance)((total, account) => {
    val b = balanceState.getAccountValue(account.accountId, queryDate)
    // FX this into parent ccy
    val fx = priceState.getFX(AssetPair(account.key.assetId, ccy), queryDate).getOrElse(throw new Exception(s"Missing FX for ${account.key.assetId.symbol}/${ccy.symbol}"))
    total + b * fx
  })

  private val headCashflows = if (startBalance.number.isZero) inflows else Cashflow(firstDate, startBalance, accountId) +: inflows

  private val initialCashflows = headCashflows :+ Cashflow(queryDate, endBalance, accountId)
  // Normalise the cashflow table to a an appropriate single currency
  val cashflows = initialCashflows.map(cf => {
    val converted = (PositionSet() + cf.value).convertViaChain(acctState.baseCurrency, assetChainMap(cf.source), priceState, cf.date)
    cf.copy(convertedValue = Some(converted.getBalance(acctState.baseCurrency)))
  })
  val cashflowTable = CashflowTable(cashflows)
  def irr = cashflowTable.irr
  def npv = cashflowTable.npv(_)
}
