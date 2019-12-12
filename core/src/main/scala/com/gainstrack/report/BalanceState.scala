package com.gainstrack.report

import com.gainstrack.command._
import com.gainstrack.core._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}
import spire.math.SafeLong

import scala.collection.SortedMap

case class BalanceStateSeries(series: SortedMap[LocalDate,Fraction], ccy:AssetId)
case class BalanceState(acctState:AccountState, balances:Map[AccountId,BalanceStateSeries]) extends AggregateRootState {
  type Balances = Map[AccountId,SortedMap[LocalDate,Fraction]]
  type Series = SortedMap[LocalDate,Fraction]
  val interp = TimeSeriesInterpolator.from(SortedMap[LocalDate,Fraction]())

  def getAccountValueOpt(account:AccountId, date: LocalDate) : Option[Fraction] = {
    val ret:Option[Fraction] = interp.getValue(balances.get(account).map(_.series).getOrElse(SortedMap()), date)(TimeSeriesInterpolator.step)
      .map(x => x)
       // .map(f => f.limitDenominatorTo(SafeLong(1000000)))
    ret
  }

  def getAccountValue(account:AccountId, date: LocalDate) : Fraction = {
    getAccountValueOpt(account, date).getOrElse(zeroFraction)
  }

  def getBalanceOpt(account: AccountId, date: LocalDate): Option[Amount] = {
    balances.get(account).map(entry => {
      val ccy = entry.ccy
      val ret: Fraction = interp.getValue(entry.series, date)(TimeSeriesInterpolator.step)
        .map(f => f.limitDenominatorTo(SafeLong(1000000)))
        .getOrElse(zeroFraction)
      Amount(ret, ccy)
    })
  }

  def getBalance(account: AccountId, date: LocalDate): Amount = {
    val ccy = balances(account).ccy
    Amount(getBalanceOpt(account, date).map(_.number).getOrElse(zeroFraction), ccy)
  }

  def getPosition(account:AccountId, date: LocalDate, tgtCcy:AssetId, ccyChain:Seq[AssetId], priceState:PriceState) : PositionSet = {
    var balance = getBalanceOpt(account, date).getOrElse(Amount(zeroFraction, ccyChain.head))
    // Developer assertion. Can be disabled at runtime
    // require(ccyChain.head == accounts.find(x => x.name == account).get.key.assetId)
    val pos = PositionSet() +  balance
    pos.convertViaChain(tgtCcy, ccyChain, priceState, date)
  }

  override def handle(e: DomainEvent): BalanceState = {
    e match {
      case _:GlobalCommand => this
      case e:AccountCreation => process(e)
      //case e:Transfer => process(e)
      case e:CommandWithAccounts[_] => e.toTransfers.foldLeft(this)(_.process(_))
      case e:SecurityPurchase =>  process(e)
      case e:BalanceAdjustment => process(e)
      case e:BalanceStatement => process(e)
      case _:PriceObservation => this
      case e:UnitTrustBalance => process(e)
      case _:CommodityCommand => this
    }
  }

  private def process(e:AccountCreation):BalanceState = {
    // Need to minus one in case we trade on the same day as opening!!!
    // TODO: Order events so creation come in first
    val origEntry = balances(e.accountId)
    val newSeries = origEntry.series.updated(e.date.minusDays(1), zeroFraction)
    copy(balances = balances.updated(e.accountId, origEntry.copy(series = newSeries)))
  }

  private def process(e:Transfer):BalanceState = {
    val tx = e.toTransaction
    process(tx)
  }

  private def process(e:SecurityPurchase): BalanceState = {
    val baseAcct = acctState.find(e.accountId)
    require(baseAcct.isDefined)
    process(e.toTransaction)
  }

  private def process(e:UnitTrustBalance) : BalanceState = {
    val oldBalance :Fraction = balances(e.securityAccountId).series.lastOption.map(_._2).getOrElse(zeroFraction)
    val tx = e.toTransaction(Amount(oldBalance, e.security.ccy), acctState)
    tx.map(process(_)).getOrElse(this)
  }

  private def process(e:BalanceAdjustment): BalanceState = {
    val account = acctState.accounts.find(_.accountId == e.accountId).getOrElse(throw new IllegalStateException(s"Account ${e.accountId} is not defined"))
    val targetAccountId = if (account.options.multiAsset) e.accountId.subAccount(e.balance.ccy.symbol) else e.accountId
    // Since we are in date order, we can query state of yesterday already
    val oldValue = this.getBalance(targetAccountId, e.date.minusDays(1))

    val tfrs = e.toTransfers(acctState.accounts, oldValue)
    tfrs.map(_.toTransaction).foldLeft(this)(_.process(_))

//
//    val dest = tfr.dest
//
//    // val origEntry = balances(e.accountId) // This doesn't work due to multiAsset support
//    val origEntry = balances(dest)
//
//    val newSeries = origEntry.series.updated(e.date, e.balance.number)
//    copy(balances = balances.updated(dest, origEntry.copy(series = newSeries)))
  }

  private def process(e:BalanceStatement): BalanceState = {
    process(e.adjustment)
  }

  private def process(tx:Transaction) : BalanceState = {
    val newBalances = tx.filledPostings.foldLeft(balances)( (bs:Map[AccountId,BalanceStateSeries],p:Posting) => {
      require(bs.isDefinedAt(p.account), s"${p.account} must be populated")
      // To assert this, we need full acct details, not just the keys
      // require(!bs(p.account).isEmpty, s"${p.account} should have initial balance on opening")
      val origEntry = bs(p.account)
      val latestBalance = origEntry.series.lastOption.getOrElse(MinDate->zeroFraction)._2
      // TODO: Unit check?
      val newBalance : Fraction=  p.value.get.number + latestBalance
      val series : Series = origEntry.series.updated(tx.postDate, newBalance)
      val newbs = bs.updated(p.account, origEntry.copy(series = series))
      newbs
    })

    copy(balances = newBalances)
  }
}

object BalanceState {
  def apply(acctState : AccountState) : BalanceState = {
    val emptySeries : SortedMap[LocalDate,Fraction] = SortedMap.empty
    val initMap:Map[AccountId,BalanceStateSeries] = acctState.accounts.map(x => x.name -> BalanceStateSeries( emptySeries, x.key.assetId)).toMap
    BalanceState(acctState, initMap)
  }

  def mock(acctState: AccountState) : BalanceState = {
    val mockSeries : SortedMap[LocalDate,Fraction] = SortedMap(MinDate -> 9999)
    val initMap:Map[AccountId,BalanceStateSeries] = acctState.accounts.map(x => x.name -> BalanceStateSeries( mockSeries, x.key.assetId)).toMap
    BalanceState(acctState, initMap)
  }
}