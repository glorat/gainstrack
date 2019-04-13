package com.gainstrack.core

import java.math.RoundingMode

import net.glorat.cqrs.DomainEvent
import spire.math.{Rational, SafeLong}

trait CommodityDB {

}

trait UserExperience extends DomainEvent
trait AccountEvent extends UserExperience {
  def accountId: AccountId
  def date:LocalDate
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
                       name: String,
                       assetId: AssetId
                     ) {
  def inferAccountType: String = {
    name.split(':').head
  }

  AccountType.withName(inferAccountType)
}

object AccountKey {

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
  def accountId = key.name
}

case class BalanceObservation (
                                accountId:AccountId,
                                date: LocalDate, // post or enter?
                              balance:Balance
                              ) extends AccountEvent


/** Generates postings based on costs for money transfers */
case class Transfer(
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

