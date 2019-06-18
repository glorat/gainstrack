package com.gainstrack.core

import java.math.RoundingMode

import net.glorat.cqrs.{Command, DomainEvent}
import spire.math.{Rational, SafeLong}

trait CommodityDB {

}

trait AccountCommand extends Command with DomainEvent with Ordered[AccountCommand] {
  // Mandatory fields
  def date : LocalDate
  def description: String
  def toGainstrack: String

  // Required for filtering
  def mainAccount : Option[AccountId]
  def involvedAccounts : Set[AccountId]

  // Helper methods
  def hasMainAccount(accountId:Option[AccountId]) : Boolean = mainAccount == accountId
  def usesAccount(accountId: AccountId) : Boolean = involvedAccounts.contains(accountId) ||  mainAccount == Some(accountId)
  def usesSubAccountOf(parentId: AccountId) : Boolean = involvedAccounts.find(a => a.isSubAccountOf(parentId)).isDefined

  override def compare(that: AccountCommand): Int = {
    this.toOrderValue.compare(that.toOrderValue)
  }

  def toOrderValue:Long = {
    date.toEpochDay
  }

  def withOption(key:String, valueStr:String):AccountCommand = {
    throw new IllegalArgumentException(s"Option ${key} is not supported by ${this.getClass.getName}")
  }
}

trait BeancountCommand {
  def origin: AccountCommand
  def toBeancount : String
}

object AccountCommand  {

}

trait AccountEvent extends DomainEvent {
  def accountId: AccountId
  def date:LocalDate
}


trait AccountType {
  // A quick and dirty cheat
  override val toString: String = this.getClass.getSimpleName.dropRight(1)
}
case object Assets extends AccountType
case object Liabilities extends AccountType
case object Equity extends AccountType
case object Income extends AccountType
case object Expenses extends AccountType
object AccountType {
  val all = Set(Assets, Liabilities, Equity, Income, Expenses)

  def apply(str:String) : AccountType = {
    str match {
      case "Assets" => Assets
      case "Liabilities" => Liabilities
      case "Equity" => Equity
      case "Income" => Income
      case "Expenses" => Expenses
      case _ => throw new IllegalArgumentException(s"${str} is not an account type")
    }
  }

}

//import AssetType.AssetType

case class AssetId(symbol: String) {
  require(symbol.toUpperCase == symbol, s"Asset id must be all caps: ${symbol}")
}
object AssetId {

}

case class Commodity (
  guid: GUID,
  namespace: String,
  mnemonic: String,
  fullname: String,
  cusip: String,
  fraction: Int
)

case class AccountKey(
                       name: AccountId,
                       assetId: AssetId
                     ) {
  name.accountType // Check it
}

object AccountKey {
  def apply(name:String, assetId:AssetId):AccountKey = AccountKey(AccountId(name), assetId)
}


