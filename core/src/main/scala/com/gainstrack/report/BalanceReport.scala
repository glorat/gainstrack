package com.gainstrack.report

import com.gainstrack.command.AccountCreation
import com.gainstrack.core._
import jdk.internal.dynalink.linker.MethodTypeConversionStrategy

/**
  * Generates a projection of the balance of all accounts given a date
  * @param cmds
  * @param startDate
  * @param endDate
  */
class BalanceReport(cmds:Seq[BeancountCommand], criteria:Transaction=>Boolean) {
  private var state = BalanceReportState()
  def getState:BalanceReportState = state

  cmds.foreach(cmd => {
    cmd match {
      case tx:Transaction if criteria(tx) => {
        state = state.processTx(tx)
      }
      case _ => state
    }
  })
}

object BalanceReport {
  // FIXME: Document clearly that this is inclusive of endDate so caller needs to be careful of double counting
  // and other off by one bugs
  def apply(cmds:Seq[BeancountCommand], startDate:LocalDate=MinDate, endDate:LocalDate=MaxDate) : BalanceReport = {
    val criteria:Transaction=>Boolean = tx =>  tx.postDate.isAfter(startDate) && ((tx.postDate.isBefore(endDate) || tx.postDate.isEqual(endDate)))
    new BalanceReport(cmds, criteria)
  }

  def apply(cmds:Seq[BeancountCommand]) : BalanceReport = {
    new BalanceReport(cmds, x => true)
  }
}

case class BalanceReportState(balances:Map[AccountId, PositionSet]) {

  def toDTO = {
    balances.map(kv => kv._1.n -> kv._2.toDTO)
  }

  def totalPosition(accountId:AccountId) : PositionSet = {
    balances.keys.toSeq.filter(_.isSubAccountOf(accountId)).foldLeft(PositionSet())((ps,account) => {
      val value = balances(account)
      ps + value
    })
  }

  def convertedPosition(accountId: AccountId, date: LocalDate, conversionStrategy: String)
                       (implicit assetChainMap: AssetChainMap, origAcctState: AccountState, priceState: PriceFXConverter, singleFXConversion: SingleFXConverter)
  : PositionSet = {
    val acctState = origAcctState.withInterpolatedAccounts
    val accountOpt = acctState.accountMap.get(accountId)
    accountOpt.map(account => {
      val fn:AccountId=>PositionSet = balances.get(_).getOrElse(PositionSet())
      val balanceConversion = new BalanceConversion(conversionStrategy, account.key.assetId, fn, date)
      balanceConversion.convertTotal(accountId, _=>true)
    }).getOrElse(PositionSet() + Amount(0, acctState.baseCurrency))

  }

  def childPositions(accountId: AccountId, date:LocalDate, conversionStrategy: String)
                    (implicit assetChainMap: AssetChainMap, origAcctState: AccountState, priceState: PriceFXConverter, singleFXConversion: SingleFXConverter)
  : Map[AccountId, PositionSet] = {

    val acctState = origAcctState.withInterpolatedAccounts
    val accountOpt = acctState.accountMap.get(accountId)
    accountOpt.map(account => {
      val fn:AccountId=>PositionSet = balances.get(_).getOrElse(PositionSet())
      val balanceConversion = new BalanceConversion(conversionStrategy, account.key.assetId, fn, date)

      val children = acctState.accounts
        .filter(_.accountId.isSubAccountOf(accountId))
        .map(_.accountId)

      children.map(childAccountId => childAccountId -> balanceConversion.convert(childAccountId)).toMap
    }).getOrElse(Map())
  }

  def processTx(tx:Transaction) : BalanceReportState = {
    tx.filledPostings.foldLeft(this)(BalanceReportState.processPosting)
  }


}

object BalanceReportState {
  def apply() : BalanceReportState = {
    BalanceReportState(Map())
  }

  private def processPosting(self:BalanceReportState, posting:Posting) = {
    val oldPosition = self.balances.get(posting.account).getOrElse(PositionSet())
    val newPosition = oldPosition + posting.value.get
    val newBalance = self.balances.updated(posting.account, newPosition)
    self.copy(balances = newBalance)
  }
}