package com.gainstrack.core

import net.glorat.cqrs.{AggregateRoot, AggregateRootState, DomainEvent}

class BeancountGenerator extends AggregateRoot {
  val headers:Seq[String] = Seq (
    "option \"title\" \"Example Beancount file\"",
    "option \"operating_currency\" \"GBP\"",
    "plugin \"beancount.plugins.implicit_prices\""
  )
  def toBeancount: String = {
    val lines:Seq[String] = headers ++ getState.accounts.map(_.toBeancount) ++ getState.txs
    lines.mkString("\n")
  }

  override protected var state: AggregateRootState = BeancountState(java.util.UUID.randomUUID(),Seq(),Seq())

  override def id: GUID = getState.id

  override def getState: BeancountState = state.asInstanceOf[BeancountState]


}

case class BeancountState(id:GUID, accounts:Seq[AccountCreation], txs:Seq[String])
extends AggregateRootState {
  def handle(e: DomainEvent): AggregateRootState = {
    e match {
      case e:AccountCreation => process(e)
      case e:Transfer => process(e)
      case e:SecurityPurchase =>  process(e)
      case e:BalanceAdjustment => process(e)
    }
  }

  private def process(e:AccountCreation):BeancountState = {
    copy(accounts = accounts :+ e)
  }

  private def process(e:Transfer):BeancountState = {
    copy(txs = txs :+ e.toTransaction.toBeancount)
  }

  private def process(e:SecurityPurchase): BeancountState = {

    var ret = this
    val baseAcct = accounts.find(x => x.name == e.accountId)
    require(baseAcct.isDefined)
    if (!accounts.exists(x => x.name == e.srcAcct)) {
      // Auto vivify sub-accounts of securities account
      val newAcct = AccountCreation(baseAcct.get.date, AccountKey(e.srcAcct, e.cost.ccy))
      ret = ret.copy(accounts = ret.accounts :+ newAcct)
    }
    if (!accounts.exists(x => x.name == e.secAcct)) {
      // Auto vivify sub-accounts of securities account
      val newAcct = AccountCreation(baseAcct.get.date, AccountKey(e.secAcct, e.security.ccy))
      ret=ret.copy(accounts = ret.accounts :+ newAcct)
    }

    val newTxs = e.toTransaction(baseAcct.get.options).toBeancount
    ret = ret.copy(txs = ret.txs :+ e.toTransaction(baseAcct.get.options).toBeancount )
    ret
  }

  private def process(e:BalanceAdjustment) = {
    copy(txs = txs ++ e.toBeancounts)
  }
}