package com.gainstrack.core

import net.glorat.cqrs.DomainEvent

trait CommodityDB {

}

trait UserExperience extends DomainEvent
trait AccountEvent extends UserExperience {
  def accountId: GUID
  def date:LocalDate
}

object AssetType  extends Enumeration {
  type AssetType = Value
  val Ticker, ISIN, CUSIP, Currency, User = Value
}

import AssetType.AssetType

case class AssetId(
                      namespace: AssetType,
                      symbol: String
                      )

case class Commodity (
  guid: GUID,
  namespace: String,
  mnemonic: String,
  fullname: String,
  cusip: String,
  fraction: Int
)

case class AccountKey(
                       guid : GUID,
                       name: String,
                       accountType: String,
                       assetId: AssetId,
                       parentGuid: Option[GUID]
                     )

object AccountKey {
  def apply(name:String, accountType:String, assetId:AssetId) : AccountKey = {
    AccountKey(java.util.UUID.randomUUID(), name, accountType, assetId, None)
  }

  def apply(name:String, accountType:String, assetId:AssetId, parentGuid:GUID) : AccountKey = {
    AccountKey(java.util.UUID.randomUUID(), name, accountType, assetId, Some(parentGuid))
  }
}

case class AccountCreation (
                           key: AccountKey,
                             assetNonStdScu: Option[Int],
                             code:String,
                             description:String,
                             hidden: Boolean,
                             placeholder: Boolean
                           ) extends AccountEvent {
  def guid = key.guid
  def accountId = guid
  def date = MinDate // First event for account
}

case class BalanceObservation (
                                id: GUID,
                                accountId:GUID,
                                date: LocalDate, // post or enter?
                                value: Fraction,
                                currency: AssetId
                              ) extends AccountEvent


case class Transfer(
                   id:GUID,
                   source: GUID,
                   dest: GUID,
                   date: LocalDate,
                   sourceValue: Fraction,
                   sourceCurrency: AssetId,
                   targetValue: Fraction,
                   targetCurrency: AssetId
                   ) extends UserExperience {
  def fxRate:Fraction = {
    targetValue/sourceValue
  }
}

case class Transaction (
                      id: GUID,
                      currency: GUID,
                      num: String,
                       /** Business time */
                      postDate: ZonedDateTime,
                       /** System time */
                      enterDate: LocalDate,
                      description: String,
                      splits: Seq[Split]
                    ) {
  //require(splits.map(_.value).sum == 0, "Total value of splits must be zero")
}

object Transaction {
  def simple(currency:GUID, enterDate: LocalDate): Transaction = {
    val id = java.util.UUID.randomUUID()
    val src = ???
    val dest = ???
    val splits : Seq[Split] = Seq(src, dest)
    Transaction(id, currency, "", now(), enterDate, "", splits)
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