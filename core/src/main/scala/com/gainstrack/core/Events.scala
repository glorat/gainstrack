package com.gainstrack.core

import net.glorat.cqrs.DomainEvent
import spire.math.{Rational, SafeLong}

trait CommodityDB {

}

trait UserExperience extends DomainEvent
trait AccountEvent extends UserExperience {
  def accountId: AccountId
  def date:LocalDate
}

object AssetType  extends Enumeration {
  type AssetType = Value
  val Ticker, ISIN, CUSIP, Currency, User = Value
}

object AccountType extends Enumeration {
  type AccountType = Value
  val Assets,
  Liabilities,
  Equity,
  Income,
  Expenses = Value
}

//import AssetType.AssetType

case class AssetId(symbol: String)

case class Commodity (
  guid: GUID,
  namespace: String,
  mnemonic: String,
  fullname: String,
  cusip: String,
  fraction: Int
)

case class AccountKey(
                       guid : AccountId,
                       name: String,
                       assetId: AssetId
                     ) {
  def inferAccountType: String = {
    name.split(':').head
  }

  AccountType.withName(inferAccountType)
}

object AccountKey {
  def apply(name:String, assetId:AssetId) : AccountKey = {
    AccountKey(name, name, assetId)
  }
}

case class AccountCreation (
                           date: LocalDate,
                           key: AccountKey,
                             assetNonStdScu: Option[Int],
                             code:String,
                             description:String,
                             hidden: Boolean,
                             placeholder: Boolean
                           ) extends AccountEvent {
  def guid = key.guid
  def accountId = guid
}

case class BalanceObservation (
                                id: GUID,
                                accountId:AccountId,
                                date: LocalDate, // post or enter?
                                value: Fraction,
                                currency: AssetId
                              ) extends AccountEvent


case class Transfer(
                   id:GUID,
                   source: AccountId,
                   dest: AccountId,
                   date: LocalDate,
                   sourceValue: Balance,
                   targetValue: Balance
                   ) extends UserExperience {
  def fxRate:Fraction = {
    targetValue.value/sourceValue.value
  }

  def toTransaction : Transaction = {
    Transaction(date, "", Seq(
      Posting(source, -sourceValue, Balance(fxRate,targetValue.ccy)),
      Posting(dest, targetValue)
    ))
  }
}

case class Transaction (
                       /** Business time */
                      postDate: LocalDate,
                       description: String,
                       postings: Seq[Posting],
                       /** System time */
                      enterDate: ZonedDateTime

                    ) {
  require(postings.length>=2, "A transaction must have at least 2 postings")
  lazy val filledPostings: Seq[Posting] = {
    // Logic allows one post to have no amount
    val idx = postings.indexWhere(p => p.isEmpty)
    val ret = if (idx == -1) {
      postings
    }
    else {
      val firstPost = postings.head
      val weight : Fraction = postings.map(p=>p.weight.value).foldLeft(zeroFraction)((a:Fraction,b:Fraction)=>a+b)
      val newPost = postings(idx).copy(value = Some(Balance(-weight, firstPost.weight.ccy)))
      postings.updated(idx,newPost)
    }
    require(!ret.exists(p => p.isEmpty), "No more than one posting can be empty")
    ret
  }

  lazy val isBalanced : Boolean = {
    val filled = filledPostings
    val ccy = filled.head.weight.ccy
    filled.forall(p => p.weight.ccy == ccy) &&
      filled.map(_.weight.value).foldLeft(zeroFraction)((a:Fraction,b:Fraction)=>a+b) == 0
  }
}

object Transaction {
  def apply(postDate:LocalDate, description:String, postings:Seq[Posting]) : Transaction = {
    apply(postDate, description, postings, now())
  }
  def apply(postDateStr:String, description:String, postings:Seq[Posting]) : Transaction = {
    apply(parseDate(postDateStr), description, postings, now())
  }
  def simple(postDate: LocalDate): Transaction = {
    val id = java.util.UUID.randomUUID()
    val src = ???
    val dest = ???
    val splits : Seq[Posting] = Seq(src, dest)
    Transaction( postDate,"", splits, now())
  }
}

case class Split (
                 id: GUID,
                 account: GUID,
                 memo: String,
                 action: String,
                 value: Fraction,
                 quantity: Fraction
                 )

case class Balance(value:Fraction, ccy:AssetId) {
  private val errmsg = "Balance can only combine single currency"

  override def toString: AccountId = s"${value} ${ccy}"
  def +(rhs: Balance): Balance = {
    require(rhs.ccy == this.ccy, errmsg)
    Balance(value + rhs.value, ccy)
  }

  def -(rhs: Balance): Balance = {
    require(rhs.ccy == this.ccy, errmsg)
    Balance(value - rhs.value, ccy)
  }

  def *(rhs: Balance): Balance = {
    require(rhs.ccy == this.ccy, errmsg)
    Balance(value * rhs.value, ccy)
  }

  def /(rhs: Balance): Balance = {
    require(rhs.ccy == this.ccy, errmsg)
    Balance(value / rhs.value, ccy)
  }

  def +(rhs:Fraction): Balance = Balance(value + rhs, ccy)
  def -(rhs:Fraction): Balance = Balance(value - rhs, ccy)
  def *(rhs:Fraction): Balance = Balance(value * rhs, ccy)
  def /(rhs:Fraction): Balance = Balance(value / rhs, ccy)
  def unary_-(): Balance = Balance(-value, ccy)
}
object Balance {
  def apply(value:Fraction, ccy:String):Balance = {
    apply(value.limitDenominatorTo(SafeLong(1000000)), AssetId(ccy))
  }
}

case class Posting (
                   account: String,
                   value: Option[Balance],
                   price: Option[Balance], // @ 123 USD
                   cost: Option[Balance]   // {123 USD}

                   ) {
  val weight : Balance = {
    if (cost.isDefined) {
      cost.get * value.get.value
    }
    else if (price.isDefined) {
      price.get * value.get.value
    }
    else if (value.isDefined) {
      value.get
    }
    else {
      // Elided value from tx
      Balance(0, AssetId("USD"))
    }
  }

  def isEmpty:Boolean = value.isEmpty // Needs eliding
}
object Posting {
  def apply(account:String):Posting = {
    // Expects interpolation
    apply(account, None,None,None)
  }
  def apply(account:String, value:Balance):Posting = {
    apply(account, Some(value), None, None)
  }
  def apply(account:String, value:Balance, price:Balance):Posting = {
    apply(account, Some(value), Some(price), None)
  }

  def withCost(account:String, value:Balance, cost:Balance):Posting = {
    apply(account, Some(value), None, Some(cost))
  }

  def withCostAndPrice(account:String, value:Balance, cost:Balance, price:Balance):Posting = {
    apply(account, Some(value), Some(price), Some(cost))
  }
}