package com.gainstrack.core

import com.gainstrack.command._
import net.glorat.cqrs.{AggregateRoot, AggregateRootState, DomainEvent}
import spire.math.SafeLong

import scala.collection.SortedMap

class BalanceProjector(accounts:Seq[AccountCreation]) extends AggregateRoot {
  override protected var state: AggregateRootState = BalanceState(accounts )

  override def id: GUID = getState.id

  override def getState: BalanceState = state.asInstanceOf[BalanceState]

}

case class BalanceState(id:GUID, accounts:Seq[AccountCreation], balances:Map[AccountId,SortedMap[LocalDate,Fraction]]) extends AggregateRootState {
  type Balances = Map[AccountId,SortedMap[LocalDate,Fraction]]
  type Series = SortedMap[LocalDate,Fraction]
  val interp = TimeSeriesInterpolator.from(SortedMap[LocalDate,Fraction]())

  def getBalance(account:AccountId, date: LocalDate) : Option[Fraction] = {
    val ret:Option[Fraction] = interp.getValue(balances.getOrElse(account, SortedMap()), date)(TimeSeriesInterpolator.step)
      .map(x => x)
        .map(f => f.limitDenominatorTo(SafeLong(1000000)))
    ret
  }

  override def handle(e: DomainEvent): BalanceState = {
    e match {
      case e:AccountCreation => process(e)
      case e:Transfer => process(e)
      case e:SecurityPurchase =>  process(e)
      case e:BalanceAdjustment => process(e)
      case e:PriceObservation => this
      case e:UnitTrustBalance => process(e)
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
    val baseAcct = accounts.find(x => x.name == e.accountId)
    require(baseAcct.isDefined)
    val opts = baseAcct.get.options
    process(e.toTransaction(opts))
  }

  private def process(e:UnitTrustBalance) : BalanceState = {
    val oldBalance :Fraction = balances(e.securityAccountId).lastOption.map(_._2).getOrElse(zeroFraction)
    val tx = e.toTransaction(Balance(oldBalance, e.security.ccy))
    process(tx)
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
  def apply(accounts : Seq[AccountCreation]) : BalanceState = {
    val emptySeries : SortedMap[LocalDate,Fraction] = SortedMap.empty
    val initMap:Map[AccountId,SortedMap[LocalDate,Fraction]] = accounts.map(x => x.name -> emptySeries).toMap
    BalanceState(java.util.UUID.randomUUID(), accounts, initMap)
  }
}