package com.gainstrack.report

import com.gainstrack.core._

class PLExplain(fromDate: LocalDate, toDate: LocalDate)
               (implicit accountState: AccountState, transactionState: TransactionState, balanceState: BalanceState, priceState: PriceState, assetChainMap: AssetChainMap) {

  // FIXME: Deduct liabilities

  val baseCcy = accountState.baseCurrency
  val dailyReport = new DailyBalance(balanceState)
  val totalNetworthStart = dailyReport.convertedPosition(Assets.accountId, fromDate, "global")
  val totalNetworthEnd = dailyReport.convertedPosition(Assets.accountId, toDate, "global")
  val actualPnl = (totalNetworthEnd - totalNetworthStart).getBalance(baseCcy).number.toDouble

  // Explain P&L due to price changes
  val networthStart = dailyReport.convertedPosition(Assets.accountId, fromDate, "units")
  val ccyExplain = networthStart.ccys
  private val priceDelta:Iterable[DeltaExplain] = {
    ccyExplain.flatMap(ccy => {
      priceState.getFX(ccy, baseCcy, fromDate)
        .map(fx => DeltaExplain(ccy, fromDate, toDate, fx.toDouble))
    })
      .flatMap(exp => {
        priceState.getFX(exp.assetId, baseCcy, toDate).map(fx2 => {
          exp.copy(newPrice = fx2.toDouble)
        })
      })
  }
  val deltaExplain = priceDelta.map(_.withPosition(networthStart))
  val totalDeltaExplain = deltaExplain.map(_.explain).sum

  // Activity
  val balanceReport = BalanceReport(transactionState.cmds, fromDate, toDate)
  // Note that income/equity has reversed sign per accounting norms
  val totalEquity = -balanceReport.getState.convertedPosition(Equity.accountId, toDate, "global").getBalance(baseCcy).number.toDouble
  val totalIncome = -balanceReport.getState.convertedPosition(Income.accountId, toDate, "global").getBalance(baseCcy).number.toDouble
  val totalExpense = balanceReport.getState.convertedPosition(Expenses.accountId, toDate, "global").getBalance(baseCcy).number.toDouble

  val newActivityActual = balanceReport.getState.convertedPosition(Assets.accountId, toDate, "global").getBalance(baseCcy).number.toDouble
  - balanceReport.getState.convertedPosition(Income.accountId, fromDate, "global").getBalance(baseCcy).number.toDouble
  val newActivityPnl = newActivityActual - (totalEquity+totalIncome-totalExpense)

  // So this is the current hacky methodology
  //require(newActivityActual == newActivityPnl + totalIncome - totalExpense, s"$newActivityActual == $newActivityPnl + $totalIncome - $totalExpense")
  // that will for now, make unexplained next to zero.
  // TODO: Explain newActivityPnl properly
  val explained = totalDeltaExplain + newActivityPnl + totalEquity + totalIncome - totalExpense
  val unexplained = actualPnl - explained


  def toDTO = {
    Map("actual" -> actualPnl, "explained" -> explained, "unexplained" -> unexplained,
      "newActivityPnl" -> newActivityPnl,
      "totalEquity" -> totalEquity, "totalIncome" -> totalIncome, "totalExpense" -> totalExpense, "totalDeltaExplain" -> totalDeltaExplain
      // , "delta" -> deltaExplain
    )
  }

}

object PLExplain {
  def annual(toDate: LocalDate)
            (implicit accountState: AccountState, transactionState: TransactionState, balanceState: BalanceState, priceState: PriceState, assetChainMap: AssetChainMap): PLExplain = {
    val fromDate = toDate.minusYears(1)
    new PLExplain(fromDate, toDate)
  }
}

case class DeltaExplain(assetId:AssetId,
                        fromDate: LocalDate, toDate: LocalDate,
                        oldPrice:Double, newPrice:Double=0,
                        oldValue:Double=0, newValue:Double=0,
                        amount:Double=0, explain:Double=0) {
  def withPosition(positionSet: PositionSet): DeltaExplain = {
    val amt = positionSet.getBalance(assetId).number.toDouble
    val computed = this.copy(amount = amt, oldValue = oldPrice * amt, newValue = newPrice * amt)
    computed.copy(explain = computed.newValue - computed.oldValue)
  }
//  def withFXValues(baseCcy:AssetId, fxConverter: FXConverter) : DeltaExplain = {
//    this.copy(oldValue = fxConverter.getFX(assetId, baseCcy, fromDate).map(_.toDouble).getOrElse(0))
//      .copy(newValue= fxConverter.getFX(assetId, baseCcy, toDate).map(_.toDouble).getOrElse(0))
//  }
}