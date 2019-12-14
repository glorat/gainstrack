package com.gainstrack.core

import java.math.RoundingMode

import com.gainstrack.command.{BalanceAdjustment, GlobalCommand}
import net.glorat.cqrs.{Command, DomainEvent}
import spire.math.{Rational, SafeLong}

trait CommodityDB {

}

case class BeancountLine(value:String, origin:AccountCommand)
object BeancountLines {
  def apply(values:Seq[String], origin:AccountCommand) : Seq[BeancountLine] = {
    values.map(BeancountLine(_, origin))
  }
  def apply(value:String, origin:AccountCommand):Seq[BeancountLine] = {
    BeancountLines(Seq(value), origin)
  }
}
trait BeancountCommand {
  def origin: AccountCommand
  def toBeancount : Seq[BeancountLine]
}

trait AccountEvent extends DomainEvent {
  def accountId: AccountId
  def date:LocalDate
}


trait AccountType {
  // A quick and dirty cheat
  override val toString: String = this.getClass.getSimpleName.dropRight(1)

  implicit def accountId = AccountId(this.toString)

}
case object Assets extends AccountType
case object Liabilities extends AccountType
case object Equity extends AccountType
case object Income extends AccountType
case object Expenses extends AccountType
case object AccountRoot extends AccountType
object AccountType {
  val all = Set(Assets, Liabilities, Equity, Income, Expenses)

  def apply(str:String) : AccountType = {
    str match {
      case "Assets" => Assets
      case "Liabilities" => Liabilities
      case "Equity" => Equity
      case "Income" => Income
      case "Expenses" => Expenses
      case "" => AccountRoot
      case _ => throw new IllegalArgumentException(s"${str} is not an account type")
    }
  }

}

//import AssetType.AssetType

case class AssetId(symbol: String) extends Ordered[AssetId] {
  // FIXME: Actually, maybe require it to be ^[A-Z\.]+$
  require(symbol.toUpperCase == symbol, s"Asset id must be all caps: ${symbol}")

  override def compare(that: AssetId): Int = symbol.compare(that.symbol)
}
object AssetId {

}

case class AccountKey(
                       name: AccountId,
                       assetId: AssetId
                     ) {
  name.accountType // Check it
}

object AccountKey {
  def apply(name:String, assetId:AssetId):AccountKey = AccountKey(AccountId(name), assetId)
}


