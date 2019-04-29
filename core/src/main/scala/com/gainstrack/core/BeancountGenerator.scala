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
  // Second pass for balances
  val balanceState:BalanceState =
    cmds.foldLeft(BalanceState(acctState.accounts)) ( (state,ev) => state.handle(ev))

  // Third pass for transations
  val txState:BeancountTransactionState =
    cmds.foldLeft(BeancountTransactionState(acctState.accounts, balanceState, Seq())) ( (state, ev) => state.handle(ev))

  val lines = headers ++ acctState.accounts.map(_.toBeancount) ++ acctState.txs ++ txState.txs

  def toBeancount: String = {
    lines.mkString("\n")
  }

  def writeFile(filename:String) = {
    import java.nio.file.{Paths, Files}
    import java.nio.charset.StandardCharsets

    val str = this.toBeancount
    Files.write(Paths.get(filename), str.getBytes(StandardCharsets.UTF_8))

  }
}


case class BeancountAccountState(accounts:Seq[AccountCreation], txs:Seq[String])
extends AggregateRootState {

  lazy val accountMap:Map[AccountId, AccountCreation] = accounts.map(a => a.accountId -> a)(collection.breakOut)

  def handle(e: DomainEvent): BeancountAccountState = {
    e match {
      case e:AccountCreation => process(e)
      case e:Transfer => process(e)
      case e:SecurityPurchase =>  process(e)
      case e:BalanceAdjustment => process(e)
      case e:PriceObservation => process(e)
      case e:UnitTrustBalance => process(e)
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
      val plugin = "plugin \"beancount.plugins.book_conversions\" " +
        s""""${e.securityAccountId},${e.incomeAccountId}""""
      ret=ret.copy(accounts = ret.accounts :+ newAcct, txs = txs :+ plugin)
    }
    ret
  }

  private def process(e:BalanceAdjustment) = {
    this
  }
}


case class BeancountTransactionState(accounts:Seq[AccountCreation], balanceState:BalanceState, txs:Seq[String])
  extends AggregateRootState {
  def handle(e: DomainEvent): BeancountTransactionState = {
    e match {
      case e:AccountCreation => process(e)
      case e:Transfer => process(e)
      case e:SecurityPurchase =>  process(e)
      case e:BalanceAdjustment => process(e)
      case e:PriceObservation => process(e)
      case e:UnitTrustBalance => process(e)
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
    // FIXME: Wrong account
    val oldBalance = balanceState.getBalance(e.securityAccountId, e.date.minusDays(1)).getOrElse(zeroFraction)
    val newLine = e.toBeancount(Balance(oldBalance, e.security.ccy))
    copy(txs = txs :+ newLine)
  }

  private def process(e:BalanceAdjustment):BeancountTransactionState = {
    val oldBalance = balanceState.getBalance(e.accountId, e.date.minusDays(1)).get
    copy(txs = txs ++ e.toBeancounts(oldBalance))
  }
}