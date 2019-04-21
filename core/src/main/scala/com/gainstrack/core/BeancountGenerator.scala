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
      case e:PriceObservation => process(e)
    }
  }

  private def process(e:PriceObservation):BeancountState = {
    copy(txs = txs :+ e.toBeancount)
  }

  private def process(e:AccountCreation):BeancountState = {
    copy(accounts = accounts :+ e)
  }

  private def process(e:Transfer):BeancountState = {
    copy(txs = txs :+ e.toTransaction.toBeancount)
  }

  private def process(e:SecurityPurchase): BeancountState = {

    var ret = this
    var newLines : Seq[String] = Seq()
    val baseAcct = accounts.find(x => x.name == e.accountId).getOrElse(throw new IllegalStateException(s"${e.accountId} is not an open account"))

    if (!accounts.exists(x => x.name == e.cashAccountId)) {
      // Auto vivify sub-accounts of securities account
      val newAccts = e.createRequiredAccounts(baseAcct)
      ret = ret.copy(accounts = ret.accounts ++ newAccts)
    }
    if (!accounts.exists(x => x.name == e.securityAccountId)) {
      // Auto vivify sub-accounts of securities account
      val newAcct = AccountCreation(baseAcct.date, AccountKey(e.securityAccountId, e.security.ccy))
      newLines = newLines :+ "plugin \"beancount.plugins.book_conversions\" " +
        s""""${e.securityAccountId},${e.incomeAcctId}""""
      ret=ret.copy(accounts = ret.accounts :+ newAcct)
    }

    newLines = newLines :+ e.toTransaction(baseAcct.options).toBeancount
    ret = ret.copy(txs = txs ++ newLines )
    ret
  }

  private def process(e:UnitTrustBalance):BeancountState = {
    val baseAcct = accounts.find(x => x.name == e.accountId).getOrElse(throw new IllegalStateException(s"${e.accountId} is not an open account"))
    var ret = this
    if (!accounts.exists(x => x.name == e.cashAccountId)) {
      // Auto vivify sub accounts of unit trust account
      val newAccts = e.createRequiredAccounts(baseAcct)
      ret = ret.copy(accounts = ret.accounts ++ newAccts)
    }
    if (!accounts.exists(x => x.name == e.securityAccountId)) {
      // Auto vivify sub-accounts of securities account
      val newAcct = AccountCreation(baseAcct.date, AccountKey(e.securityAccountId, e.security.ccy))
      ret=ret.copy(accounts = ret.accounts :+ newAcct)
    }
    ret
  }

  private def process(e:BalanceAdjustment) = {
    copy(txs = txs ++ e.toBeancounts)
  }
}