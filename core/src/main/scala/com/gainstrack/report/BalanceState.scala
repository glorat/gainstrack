package com.gainstrack.report

import com.gainstrack.command._
import com.gainstrack.core._
import net.glorat.cqrs.{AggregateRoot, AggregateRootState, DomainEvent}
import spire.math.SafeLong

import scala.collection.SortedMap

case class BalanceState(accounts:Set[AccountCreation], balances:Map[AccountId,SortedMap[LocalDate,Fraction]]) extends AggregateRootState {
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
    // Need to minus one in case we trade on the same day as opening!!!
    val newBalance = balances(e.accountId).updated(e.date.minusDays(1), zeroFraction)
    copy(balances = balances.updated(e.accountId, newBalance))
  }

  private def process(e:Transfer):BalanceState = {
    val tx = e.toTransaction
    process(tx)
  }

  private def process(e:SecurityPurchase): BalanceState = {
    val baseAcct = accounts.find(x => x.name == e.accountId)
    require(baseAcct.isDefined)
    process(e.toTransaction)
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
      val newbs = bs.updated(p.account, series)
      newbs
    })

    copy(balances = newBalances)
  }
}

object BalanceState {
  def apply(accounts : Set[AccountCreation]) : BalanceState = {
    val emptySeries : SortedMap[LocalDate,Fraction] = SortedMap.empty
    val initMap:Map[AccountId,SortedMap[LocalDate,Fraction]] = accounts.map(x => x.name -> emptySeries).toMap
    BalanceState(accounts, initMap)
  }
}