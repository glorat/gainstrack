package com.gainstrack.core

import net.glorat.cqrs.{AggregateRoot, AggregateRootState, DomainEvent}

class BeancountGenerator(cmds:Seq[AccountCommand])  {
  val headers:Seq[String] = Seq (
    "option \"title\" \"Example Beancount file\"",
    "option \"operating_currency\" \"GBP\"",
    "plugin \"beancount.plugins.implicit_prices\""
  )


  // First pass for accounts
  val acctState:BeancountAccountState =
    cmds.foldLeft(BeancountAccountState(Seq(), Seq())) ( (state, ev) => state.handle(ev))
  // Second pass for transations
  val txState:BeancountTransactionState =
    cmds.foldLeft(BeancountTransactionState(acctState.accounts, Seq())) ( (state, ev) => state.handle(ev))

  val lines = headers ++ acctState.accounts.map(_.toBeancount) ++ acctState.txs ++ txState.txs

  def toBeancount: String = {
    lines.mkString("\n")
  }

}


case class BeancountAccountState(accounts:Seq[AccountCreation], txs:Seq[String])
extends AggregateRootState {
  def handle(e: DomainEvent): BeancountAccountState = {
    e match {
      case e:AccountCreation => process(e)
      case e:Transfer => process(e)
      case e:SecurityPurchase =>  process(e)
      case e:BalanceAdjustment => process(e)
      case e:PriceObservation => process(e)
    }
  }

  private def process(e:PriceObservation):BeancountAccountState = {
    this
  }

  private def process(e:AccountCreation):BeancountAccountState = {
    copy(accounts = accounts :+ e)
  }

  private def process(e:Transfer):BeancountAccountState = {
    this
  }

  private def process(e:SecurityPurchase): BeancountAccountState = {

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
    ret = ret.copy(txs = txs ++ newLines )
    ret
  }

  private def process(e:UnitTrustBalance):BeancountAccountState = {
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
    this
  }
}


case class BeancountTransactionState(accounts:Seq[AccountCreation], txs:Seq[String])
  extends AggregateRootState {
  def handle(e: DomainEvent): BeancountTransactionState = {
    e match {
      case e:AccountCreation => process(e)
      case e:Transfer => process(e)
      case e:SecurityPurchase =>  process(e)
      case e:BalanceAdjustment => process(e)
      case e:PriceObservation => process(e)
    }
  }

  private def process(e:PriceObservation):BeancountTransactionState = {
    copy(txs = txs :+ e.toBeancount)
  }

  private def process(e:AccountCreation):BeancountTransactionState = {
    this
  }

  private def process(e:Transfer):BeancountTransactionState = {
    copy(txs = txs :+ e.toTransaction.toBeancount)
  }

  private def process(e:SecurityPurchase): BeancountTransactionState = {

    var ret = this
    var newLines : Seq[String] = Seq()
    val baseAcct = accounts.find(x => x.name == e.accountId).getOrElse(throw new IllegalStateException(s"${e.accountId} is not an open account"))

    newLines = newLines :+ e.toTransaction(baseAcct.options).toBeancount
    ret = ret.copy(txs = txs ++ newLines )
    ret
  }

  private def process(e:UnitTrustBalance):BeancountTransactionState = {
    val baseAcct = accounts.find(x => x.name == e.accountId).getOrElse(throw new IllegalStateException(s"${e.accountId} is not an open account"))
    var ret = this
    ret
  }

  private def process(e:BalanceAdjustment):BeancountTransactionState = {
    copy(txs = txs ++ e.toBeancounts)
  }
}