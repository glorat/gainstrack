package com.gainstrack.report

import com.gainstrack.core._
import com.gainstrack.command.AccountCreation

class AccountInvestmentReport(accountId: AccountId, ccy:AssetId, fromDate:LocalDate, queryDate: LocalDate, acctState:AccountState, balanceState:BalanceState, txState:TransactionState, singleFXConversion: FXConverter) {
  val account: AccountCreation = acctState.accountMap(accountId)

  val cmds: Seq[BeancountCommand] = txState.cmds.filter(cmd => cmd.origin.date.isAfter(fromDate) && cmd.origin.date.isBefore(queryDate.plusDays(1)) )
  val inflows: Seq[Cashflow] = new InflowCalculator(cmds).calcInflows(accountId)

  // Go just before the first cashflow so we have a good startBalance
  val firstDate: LocalDate = inflows.headOption.map(_.date.minusDays(1)).getOrElse(fromDate)

  // Take just the final equity balance as positive
  val allAccounts: Set[AccountCreation] = acctState.accounts.filter(a => a.accountId.isSubAccountOf(accountId))
  val initBalance: Amount = Amount(zeroFraction, ccy)

  val startBalance: Amount = allAccounts.foldLeft(initBalance)((total, account) => {
    val b = balanceState.getAccountValue(account.accountId, firstDate)
    // FX this into parent ccy
    val fx = singleFXConversion.getFX(account.key.assetId, ccy, firstDate).getOrElse(throw new Exception(s"Missing FX for ${account.key.assetId.symbol}/${ccy.symbol}"))
    -(total + b * fx)
  })

  val endBalance: Amount = allAccounts.foldLeft(initBalance)((total, account) => {
    val b = balanceState.getAccountValue(account.accountId, queryDate)
    // FX this into parent ccy
    val fx = singleFXConversion.getFX(account.key.assetId, ccy, queryDate).getOrElse(throw new Exception(s"Missing FX for ${account.key.assetId.symbol}/${ccy.symbol}"))
    total + b * fx
  })

  private val headCashflows = if (startBalance.number.isZero) inflows else Cashflow(firstDate, startBalance, accountId) +: inflows

  private val initialCashflows = headCashflows :+ Cashflow(queryDate, endBalance, accountId)
  // Normalise the cashflow table to a an appropriate single currency
  val cashflows: Seq[Cashflow] = initialCashflows.map(cf => {

    // FIXME: Use singleFXConversion
    val converted = (PositionSet() + cf.value).convertTo(acctState.baseCurrency, singleFXConversion, cf.date)
    // val converted = (PositionSet() + cf.value).convertViaChain(acctState.baseCurrency, assetChainMap(cf.source), singleFXConversion, cf.date)
    cf.copy(convertedValue = Some(converted.getBalance(acctState.baseCurrency)))
  })
  val cashflowTable: CashflowTable = CashflowTable(cashflows)
  def irr = cashflowTable.irr
  def npv: Double => Double = cashflowTable.npv(_)
}
