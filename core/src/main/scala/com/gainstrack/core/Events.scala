package com.gainstrack.core

import java.math.RoundingMode

import net.glorat.cqrs.{Command, DomainEvent}
import spire.math.{Rational, SafeLong}

trait CommodityDB {

}

trait AccountCommand extends Command with DomainEvent with Ordered[AccountCommand] {
  def date : LocalDate
  //def accountId: AccountId

  // import scala.math.Ordered.orderingToOrdered

  override def compare(that: AccountCommand): Int = {
    this.toOrderValue.compare(that.toOrderValue)
  }

  def toOrderValue:Long = {
    date.toEpochDay
    /*
    val typeOrder = this match {
      case _:AccountCreation => 1  // They come first
      case _:SecurityPurchase => 2 // These can auto-vivify accounts

      case _ => 10
    }

    val dateOrder = date.toEpochDay
    // Type then date
    (typeOrder*10000000) + dateOrder*/
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


trait AccountType
case object Assets extends AccountType
case object Liabilities extends AccountType
case object Equity extends AccountType
case object Income extends AccountType
case object Expenses extends AccountType
object AccountType {
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

  def fromAccountId(str:AccountId):AccountType = {
    val prefix = str.split(":").headOption
      .getOrElse(throw new IllegalArgumentException(s"${str} is not in account format") )
    AccountType(prefix)
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
  def inferAccountType: String = {
    name.split(':').head
  }

  AccountType(inferAccountType)
}

object AccountKey {

}


