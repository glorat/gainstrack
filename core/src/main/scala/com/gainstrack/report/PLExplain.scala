package com.gainstrack.report

import com.gainstrack.core._

class PLExplain(fromDate: LocalDate, toDate: LocalDate)
               (implicit accountState: AccountState, transactionState: TransactionState, balanceState: BalanceState, priceState: PriceFXConverter, assetChainMap: AssetChainMap, singleFXConversion: SingleFXConverter) {

  // FIXME: Deduct liabilities

  val baseCcy = accountState.baseCurrency
  val dailyReport = new DailyBalance(balanceState)
  val totalNetworthStart = dailyReport.convertedPosition(Assets.accountId, fromDate, "global")
  val totalNetworthEnd = dailyReport.convertedPosition(Assets.accountId, toDate, "global")
  val actualPnl = (totalNetworthEnd - totalNetworthStart).getBalance(baseCcy).number.toDouble

  // Explain P&L due to price changes
  val networthStart = dailyReport.convertedPosition(Assets.accountId, fromDate, "units")
  val ccyExplain = networthStart.ccys
  private val priceDelta: Iterable[DeltaExplain] = {
    ccyExplain.flatMap(ccy => {
      singleFXConversion.getFX(ccy, baseCcy, fromDate)
        .map(fx => DeltaExplain(ccy, fromDate, toDate, fx.toDouble))
    })
      .flatMap(exp => {
        singleFXConversion.getFX(exp.assetId, baseCcy, toDate).map(fx2 => {
          exp.copy(newPrice = fx2.toDouble)
        })
      })
  }
  val deltaExplain = priceDelta
    .map(_.withPosition(networthStart))
    .filter(_.explain != 0.0)
  val totalDeltaExplain = deltaExplain.map(_.explain).sum

  // Activity
  val balanceReport = BalanceReport(transactionState.cmds, fromDate, toDate)
  // Note that income/equity has reversed sign per accounting norms
  val totalEquity = -balanceReport.getState.convertedPosition(Equity.accountId, toDate, "global").getBalance(baseCcy).number.toDouble
  val totalIncome = -balanceReport.getState.convertedPosition(Income.accountId, toDate, "global").getBalance(baseCcy).number.toDouble
  val totalExpense = balanceReport.getState.convertedPosition(Expenses.accountId, toDate, "global").getBalance(baseCcy).number.toDouble

  val newActivityActual =
    balanceReport.getState.convertedPosition(Assets.accountId, toDate, "global").getBalance(baseCcy).number.toDouble
  // - balanceReport.getState.convertedPosition(Income.accountId, fromDate, "global").getBalance(baseCcy).number.toDouble
  val newActivityPnl = newActivityActual - (totalEquity+totalIncome-totalExpense)

  val newActivityByAccount = balanceReport.getState.childPositions(Assets.accountId, toDate, "global")
    .map(kv => kv._1.n -> kv._2.getBalance(baseCcy).number.toDouble)
    .filter(_._2 != 0.0)

  // So this is the current hacky methodology
  //require(newActivityActual == newActivityPnl + totalIncome - totalExpense, s"$newActivityActual == $newActivityPnl + $totalIncome - $totalExpense")
  // that will for now, make unexplained next to zero.
  // TODO: Explain newActivityPnl properly
  val explained = totalDeltaExplain + newActivityPnl + totalEquity + totalIncome - totalExpense
  val unexplained = actualPnl - explained


  def toDTO = {
//    Map("fromDate" -> fromDate, "toDate" -> toDate,
//      "actual" -> actualPnl, "explained" -> explained, "unexplained" -> unexplained,
//      "newActivityPnl" -> newActivityPnl,
//      "totalEquity" -> totalEquity, "totalIncome" -> totalIncome, "totalExpense" -> totalExpense, "totalDeltaExplain" -> totalDeltaExplain,
//      "delta" -> deltaExplain
//    )
    PLExplainDTO(Some(fromDate), Some(toDate),Some(totalNetworthEnd.getBalance(baseCcy).number.toDouble) ,actualPnl, explained, unexplained,
      newActivityPnl, newActivityByAccount.map(x => PnlAccountComponent(x._1, x._2)).toSeq.sortBy(_.accountId),
      totalEquity, totalIncome, totalExpense, totalDeltaExplain,
      deltaExplain.toSeq)
  }

}

case class PnlAccountComponent(accountId: String, explain: Double)
case class PLExplainDTO(fromDate:Option[LocalDate], toDate:Option[LocalDate],
                        toNetworth: Option[Double],
                        actual:Double, explained:Double, unexplained:Double,
                        newActivityPnl: Double, newActivityByAccount: Seq[PnlAccountComponent],
                        totalEquity: Double, totalIncome:Double, totalExpense:Double, totalDeltaExplain:Double,
                        delta: Seq[DeltaExplain],
                        tenor: String = "") {
  def withLabel(label:String) : PLExplainDTO = {
    copy(tenor = label)
  }

  def divide(n:Double): PLExplainDTO = {
    this.copy(
      actual = actual / n,
      explained = explained / n,
      unexplained = unexplained / n,
      newActivityPnl = newActivityPnl / n,
      totalEquity = totalEquity / n,
      totalIncome = totalIncome / n,
      totalExpense = totalExpense / n,
      totalDeltaExplain = totalDeltaExplain / n,
      delta = Seq()
    )
  }
}

object PLExplainDTO {

  def total(exps: Iterable[PLExplainDTO]) : PLExplainDTO = {
    PLExplainDTO(
      fromDate = None, toDate = None,
      toNetworth = None,
      actual = exps.map(_.actual).sum,
      explained = exps.map(_.explained).sum,
      unexplained = exps.map(_.unexplained).sum,
      newActivityPnl = exps.map(_.newActivityPnl).sum,
      newActivityByAccount = null, // FIXME:!!!
      totalEquity = exps.map(_.totalEquity).sum,
      totalIncome = exps.map(_.totalIncome).sum,
      totalExpense = exps.map(_.totalExpense).sum,
      totalDeltaExplain = exps.map(_.totalDeltaExplain).sum,
      delta = Seq(),
      tenor = "total")
  }
}

object PLExplain {
  def annual(toDate: LocalDate)
            (implicit accountState: AccountState, transactionState: TransactionState, balanceState: BalanceState, priceState: PriceFXConverter, assetChainMap: AssetChainMap, singleFXConversion: SingleFXConverter): PLExplain = {
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

