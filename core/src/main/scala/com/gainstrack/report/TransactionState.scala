package com.gainstrack.report

import com.gainstrack.command._
import com.gainstrack.core._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}


case class TransactionState(accounts:Set[AccountCreation], balanceState:BalanceState, cmds:Seq[BeancountCommand], lastId:Int=0)
  extends AggregateRootState {

  def handle(e: DomainEvent): TransactionState = {
    e match {
      case e:GlobalCommand => this
      case e:AccountCreation => process(e)
      case e:Transfer => process(e,e)
      case e:CommandWithAccounts[_] => e.toTransfers.foldLeft(this)(_.process(_, e.underlying))
      case e:SecurityPurchase =>  process(e)
      case e:BalanceAdjustment => process(e)
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
    val baseAcct = accounts.find(x => x.name == e.accountId).getOrElse(throw new IllegalStateException(s"${e.accountId} is not an open account"))

    this.withNewCmds(Seq(e.toTransaction))
  }

  private def process(e:UnitTrustBalance):TransactionState = {
    val baseAcct = accounts.find(x => x.name == e.accountId).getOrElse(throw new IllegalStateException(s"${e.accountId} is not an open account"))
    // FIXME: Wrong account
    val oldBalance = balanceState.getAccountValue(e.securityAccountId, e.date.minusDays(1))
    this.withNewCmds(Seq(e.toBeancountCommand(Balance(oldBalance, e.security.ccy))))
  }

  private def process(e:BalanceAdjustment):TransactionState = {

    this.withNewCmds(e.toBeancounts(balanceState, accounts))
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