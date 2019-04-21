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
    val baseAcct = accounts.find(x => x.name == e.accountId)
    require(baseAcct.isDefined)

    val incomeAcctId = e.accountId.replace("Assets:", "Income:")+s":${e.price.ccy.symbol}"
    val expenseAcctId = e.accountId.replace("Assets:", "Expenses:")+s":${e.price.ccy.symbol}"

    if (!accounts.exists(x => x.name == e.srcAcct)) {
      // Auto vivify sub-accounts of securities account
      val newBaseAccount = AccountCreation(baseAcct.get.date, AccountKey(e.srcAcct, e.price.ccy))
      val cashAcct = newBaseAccount.copy(key = AccountKey(e.srcAcct + s":${e.price.ccy.symbol}", e.price.ccy))
      val incomeAcct = newBaseAccount.copy(key = AccountKey(incomeAcctId, e.price.ccy))
      val expenseAcct = newBaseAccount.copy(key = AccountKey(expenseAcctId, e.price.ccy))
      ret = ret.copy(accounts = ret.accounts ++ Seq(newBaseAccount, cashAcct, incomeAcct, expenseAcct))
    }
    if (!accounts.exists(x => x.name == e.secAcct)) {
      // Auto vivify sub-accounts of securities account
      val newAcct = AccountCreation(baseAcct.get.date, AccountKey(e.secAcct, e.security.ccy))
      newLines = newLines :+ "plugin \"beancount.plugins.book_conversions\" " +
        s""""${e.secAcct},${incomeAcctId}""""
      ret=ret.copy(accounts = ret.accounts :+ newAcct)
    }

    newLines = newLines :+ e.toTransaction(baseAcct.get.options).toBeancount
    ret = ret.copy(txs = txs ++ newLines )
    ret
  }

  private def process(e:BalanceAdjustment) = {
    copy(txs = txs ++ e.toBeancounts)
  }
}