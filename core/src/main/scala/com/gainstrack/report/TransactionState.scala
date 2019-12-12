package com.gainstrack.report

import com.gainstrack.command._
import com.gainstrack.core._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}


case class TransactionState(acctState:AccountState, balanceState:BalanceState, cmds:Seq[BeancountCommand], lastId:Int=0)
  extends AggregateRootState {

  def handle(e: DomainEvent): TransactionState = {
    e match {
      case e:GlobalCommand => this
      case e:AccountCreation => process(e)
      case e:Transfer => process(e,e)
      case e:CommandWithAccounts[_] => e.toTransfers.foldLeft(this)(_.process(_, e.underlying))
      case e:SecurityPurchase =>  process(e)
      case e:BalanceAdjustment => process(e)
      case e:BalanceStatement => process(e)
      case e:PriceObservation => process(e)
      case e:UnitTrustBalance => process(e)
      case _:CommodityCommand => this
    }
  }

  private def process(e:PriceObservation):TransactionState = {
    copy(cmds = cmds :+ e)
  }

  private def process(e:AccountCreation):TransactionState = {
    this
  }

  private def process(e:Transfer, origin:AccountCommand):TransactionState = {
    this.withNewCmds(Seq(e.toTransaction.copy(origin=origin)))
  }

  private def process(e:SecurityPurchase): TransactionState = {
    var newLines : Seq[String] = Seq()
    val baseAcct = acctState.find(e.accountId).getOrElse(throw new IllegalStateException(s"${e.accountId} is not an open account"))

    this.withNewCmds(Seq(e.toTransaction))
  }

  private def process(e:UnitTrustBalance):TransactionState = {
    val baseAcct = acctState.find(e.accountId).getOrElse(throw new IllegalStateException(s"${e.accountId} is not an open account"))
    // FIXME: Wrong account
    val oldBalance = balanceState.getAccountValue(e.securityAccountId, e.date.minusDays(1))
    this.withNewCmds(Seq(e.toBeancountCommand(Amount(oldBalance, e.security.ccy))(acctState)))
  }

  private def process(e:BalanceAdjustment):TransactionState = {
    val account = acctState.accounts.find(_.accountId == e.accountId).getOrElse(throw new IllegalStateException(s"Account ${e.accountId} is not defined"))
    val targetAccountId = if (account.options.multiAsset) e.accountId.subAccount(e.balance.ccy.symbol) else e.accountId
    // Since we are in date order, we can query state of yesterday already
    val setValue = balanceState.getBalance(targetAccountId, e.date.minusDays(1))
    require(e.balance == setValue, s"Internal logic fail")
    // Since per above assertion, balanceState has correct EOD balances including adjustments
    // to back out the adjustment that happened, oldValue must be based on txs so far
    val balanceReport:BalanceReport = BalanceReport(cmds)
    val oldValue = balanceReport.getState.balances.get(targetAccountId).map(_.getBalance(e.balance.ccy)).getOrElse(Amount(zeroFraction, e.balance.ccy))

    this.withNewCmds(e.toBeancounts(oldValue.number, acctState.accounts))
  }

  private def process(e:BalanceStatement):TransactionState = {
    process (e.adjustment)
  }

  private def withNewCmds(newCmds:Seq[BeancountCommand]) : TransactionState = {
    var accId = lastId
    val adjCmds:Seq[BeancountCommand] = newCmds.map(_ match {
      case tx:Transaction => {
        accId+=1
        tx.withId(accId)
      }
      case x:BeancountCommand => x
    })
    copy(cmds = cmds ++ adjCmds, lastId=accId)
  }

  def allTransactions : Seq[Transaction] = {
    cmds.filter(_.isInstanceOf[Transaction]).asInstanceOf[Seq[Transaction]]
  }

  def postingsForAccount(acctId:AccountId) = {
    allTransactions.flatMap(_.filledPostings.filter(_.account == acctId))
  }

  def txsForAccount(acctId:AccountId) : Seq[Transaction] = {
    allTransactions.filter(_.filledPostings.exists(_.account == acctId))
  }

  def txsUnderAccount(acctId:AccountId) : Seq[Transaction] = {
    allTransactions.filter(_.filledPostings.exists(_.account.isSubAccountOf(acctId)))
  }
}