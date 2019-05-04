package com.gainstrack.report

import com.gainstrack.command._
import com.gainstrack.core._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}


case class TransactionState(accounts:Set[AccountCreation], balanceState:BalanceState, cmds:Seq[BeancountCommand])
  extends AggregateRootState {

  def handle(e: DomainEvent): TransactionState = {
    e match {
      case e:AccountCreation => process(e)
      case e:Transfer => process(e)
      case e:SecurityPurchase =>  process(e)
      case e:BalanceAdjustment => process(e)
      case e:PriceObservation => process(e)
      case e:UnitTrustBalance => process(e)
    }
  }

  private def process(e:PriceObservation):TransactionState = {
    copy(cmds = cmds :+ e)
  }

  private def process(e:AccountCreation):TransactionState = {
    this
  }

  private def process(e:Transfer):TransactionState = {
    copy(cmds = cmds :+ e.toTransaction)
  }

  private def process(e:SecurityPurchase): TransactionState = {

    var ret = this
    var newLines : Seq[String] = Seq()
    val baseAcct = accounts.find(x => x.name == e.accountId).getOrElse(throw new IllegalStateException(s"${e.accountId} is not an open account"))

    ret = ret.copy(cmds = cmds :+ e.toTransaction(baseAcct.options) )
    ret
  }

  private def process(e:UnitTrustBalance):TransactionState = {
    val baseAcct = accounts.find(x => x.name == e.accountId).getOrElse(throw new IllegalStateException(s"${e.accountId} is not an open account"))
    // FIXME: Wrong account
    val oldBalance = balanceState.getBalance(e.securityAccountId, e.date.minusDays(1)).getOrElse(zeroFraction)
    copy(cmds = cmds :+ e.toBeancountCommand(Balance(oldBalance, e.security.ccy)))
  }

  private def process(e:BalanceAdjustment):TransactionState = {
    val oldBalance = balanceState.getBalance(e.accountId, e.date.minusDays(1)).get
    copy(cmds = cmds ++ e.toBeancounts(oldBalance))
  }
}