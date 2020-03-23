package com.gainstrack.report

import com.gainstrack.command.{Transfer, UnitTrustBalance, YieldCommand}
import com.gainstrack.core._

class PLExplain(startDate: LocalDate, toDate: LocalDate)
               (implicit accountState: AccountState, transactionState: TransactionState, balanceState: BalanceState, priceState: PriceFXConverter, assetChainMap: AssetChainMap, singleFXConversion: SingleFXConverter) {

  // To include startDate, we must be at the start of startDate, which is the
  // end-of-day of the previous day!
  val fromDate = startDate.minusDays(1)
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
  val criteria:Transaction=>Boolean = tx =>  tx.postDate.isAfter(fromDate) && ((tx.postDate.isBefore(toDate) || tx.postDate.isEqual(toDate)))
  val activity = transactionState.cmds.collect({case tx:Transaction=>tx}).filter(criteria)
  val newActivityByTx: Map[String, Double] = activity.map(tx => {
    val actPnl = tx.activityPnL(singleFXConversion,toDate, baseCcy)
    tx.origin.toGainstrack.head -> actPnl
  }).filter(_._2 != 0.0).toMap

  val balanceReport = BalanceReport(transactionState.cmds, fromDate, toDate)
  // Note that income/equity has reversed sign per accounting norms
  val totalEquity = -balanceReport.getState.convertedPosition(Equity.accountId, toDate, "global").getBalance(baseCcy).number.toDouble

  val yieldIncome = activity.filter(
    tx => tx.origin.isInstanceOf[YieldCommand]
//      || tx.origin.isInstanceOf[UnitTrustBalance]
//      || tx.origin.isInstanceOf[Transfer]
  ).map(tx => {
    tx.pnl(singleFXConversion, tx.postDate, baseCcy, _ match { case Income => -1.0; case _ => 0.0 })
  }).sum

  val totalIncome =
    -balanceReport.getState.convertedPosition(Income.accountId, toDate, "global").getBalance(baseCcy).number.toDouble - yieldIncome


  val totalExpense = balanceReport.getState.convertedPosition(Expenses.accountId, toDate, "global").getBalance(baseCcy).number.toDouble

  val newActivityPnl = newActivityByTx.map(_._2).sum

  // TODO: Explain newActivityPnl properly
  val explained = totalDeltaExplain + newActivityPnl + totalEquity + totalIncome + yieldIncome - totalExpense
  val unexplained = actualPnl - explained
  val toNetworth = totalNetworthEnd.getBalance(baseCcy).number.toDouble
  val changeDenom = toNetworth - actualPnl
  val networthChange =  if(changeDenom != 0.0) Some(actualPnl / changeDenom) else None


  def toDTO = {
//    Map("fromDate" -> fromDate, "toDate" -> toDate,
//      "actual" -> actualPnl, "explained" -> explained, "unexplained" -> unexplained,
//      "newActivityPnl" -> newActivityPnl,
//      "totalEquity" -> totalEquity, "totalIncome" -> totalIncome, "totalExpense" -> totalExpense, "totalDeltaExplain" -> totalDeltaExplain,
//      "delta" -> deltaExplain
//    )
    PLExplainDTO(Some(startDate), Some(toDate),Some(toNetworth), networthChange, actualPnl, explained, unexplained,
      newActivityPnl, newActivityByTx.map(x => PnlAccountComponent(x._1, x._2)).toSeq.sortBy(_.accountId),
      totalEquity, totalIncome, yieldIncome, totalExpense, totalDeltaExplain,
      deltaExplain.toSeq)
  }

}

case class PnlAccountComponent(accountId: String, explain: Double)
case class PLExplainDTO(fromDate:Option[LocalDate], toDate:Option[LocalDate],
                        toNetworth: Option[Double], networthChange: Option[Double],
                        actual:Double, explained:Double, unexplained:Double,
                        newActivityPnl: Double, newActivityByAccount: Seq[PnlAccountComponent],
                        totalEquity: Double,
                        totalIncome:Double, totalYieldIncome:Double,
                        totalExpense:Double, totalDeltaExplain:Double,
                        delta: Seq[DeltaExplain],
                        tenor: String = "") {
  def withLabel(label:String) : PLExplainDTO = {
    copy(tenor = label)
  }

  def divide(n:Double): PLExplainDTO = {
    this.copy(
      actual = actual / n,
      networthChange = None,
      explained = explained / n,
      unexplained = unexplained / n,
      newActivityPnl = newActivityPnl / n,
      totalEquity = totalEquity / n,
      totalYieldIncome = totalYieldIncome / n,
      totalIncome = totalIncome / n,
      totalExpense = totalExpense / n,
      totalDeltaExplain = totalDeltaExplain / n,
      delta = Seq()
    )
  }
}

object PLExplainDTO {

  def total(exps: Iterable[PLExplainDTO]) : PLExplainDTO = {
    val toNetworth = exps.lastOption.flatMap(_.toNetworth)
    val networthChange = toNetworth.map(nw => exps.map(_.actual).sum / nw)

    PLExplainDTO(
      fromDate = None, toDate = None,
      // toNetworth = exps.lastOption.flatMap(_.toNetworth),
      toNetworth = None,
      networthChange = networthChange,
      actual = exps.map(_.actual).sum,
      explained = exps.map(_.explained).sum,
      unexplained = exps.map(_.unexplained).sum,
      newActivityPnl = exps.map(_.newActivityPnl).sum,
      newActivityByAccount = null, // FIXME:!!!
      totalEquity = exps.map(_.totalEquity).sum,
      totalIncome = exps.map(_.totalIncome).sum,
      totalYieldIncome = exps.map(_.totalYieldIncome).sum,
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

