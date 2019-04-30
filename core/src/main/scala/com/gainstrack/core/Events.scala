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

object AccountType extends Enumeration {
  type AccountType = Value
  val Assets,
  Liabilities,
  Equity,
  Income,
  Expenses = Value
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

  AccountType.withName(inferAccountType)
}

object AccountKey {

}



