package com.gainstrack.core

import net.glorat.cqrs.{AggregateRoot, AggregateRootState, DomainEvent}

import scala.collection.SortedMap

class BalanceProjector(accountIds:Seq[AccountKey]) extends AggregateRoot {
  override protected var state: AggregateRootState = BalanceState(accountIds )

  override def id: GUID = getState.id

  override def getState: BalanceState = state.asInstanceOf[BalanceState]

}

case class BalanceState(id:GUID, accountIds:Seq[AccountKey], balances:Map[AccountId,SortedMap[LocalDate,Fraction]]) extends AggregateRootState {
  type Balances = Map[AccountId,SortedMap[LocalDate,Fraction]]
  type Series = SortedMap[LocalDate,Fraction]

  override def handle(e: DomainEvent): AggregateRootState = {
    e match {
      case e:AccountCreation => process(e)
      case e:Transfer => process(e)
      case e:SecurityPurchase =>  process(e)
      case e:BalanceAdjustment => process(e)
    }
  }

  private def process(e:AccountCreation):BalanceState = {
    val newBalance = balances(e.accountId).updated(e.date, zeroFraction)
    copy(balances = balances.updated(e.accountId, newBalance))
  }

  private def process(e:Transfer):BalanceState = {
    val tx = e.toTransaction
    process(tx)
  }

  private def process(e:SecurityPurchase): BalanceState = {
    process(e.toTransaction)
  }

  private def process(e:BalanceAdjustment): BalanceState = {
    val newBalance = balances(e.accountId).updated(e.date, e.balance.value)
    copy(balances = balances.updated(e.accountId, newBalance))
  }

  private def process(tx:Transaction) : BalanceState = {
    val newBalances = tx.filledPostings.foldLeft(balances)( (bs:Balances,p:Posting) => {
      require(bs.isDefinedAt(p.account), s"${p.account} must be populated")
      // To assert this, we need full acct details, not just the keys
      // require(!bs(p.account).isEmpty, s"${p.account} should have initial balance on opening")
      val latestBalance = bs(p.account).lastOption.getOrElse(MinDate->zeroFraction)._2
      // TODO: Unit check?
      val newBalance : Fraction=  p.value.get.value + latestBalance
      val series : Series = bs(p.account).updated(tx.postDate, newBalance)
      bs.updated(p.account, series)
    })

    copy(balances = newBalances)
  }
}

object BalanceState {
  def apply(accountIds : Seq[AccountKey]) : BalanceState = {
    val emptySeries : SortedMap[LocalDate,Fraction] = SortedMap.empty
    val initMap:Map[AccountId,SortedMap[LocalDate,Fraction]] = accountIds.map(x => x.name -> emptySeries).toMap
    BalanceState(java.util.UUID.randomUUID(), accountIds, initMap)
  }
}