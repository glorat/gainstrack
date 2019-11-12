package com.gainstrack.command

import com.gainstrack.core._

case class PriceObservation(date:LocalDate, assetId: AssetId, price:Balance)
  extends AccountCommand with BeancountCommand {
  override def origin: AccountCommand = this
  override def commandString: String = PriceObservation.prefix
  override def mainAccount: Option[AccountId] = None
  override def involvedAccounts: Set[AccountId] = Set()
  def description:String = s"${price.ccy.symbol}/${assetId.symbol} = ${price}"

  def toBeancount : Seq[BeancountLine] = {
     BeancountLines(s"${date} price ${assetId.symbol} ${price}", origin)
  }

  override def toGainstrack: Seq[String] = {
    toBeancount.map(_.value)
  }
}

object PriceObservation extends CommandParser {
  import Patterns._
  val prefix:String = "price"
  private val re = s"${datePattern} ${prefix} (\\S+) ${balanceMatch}".r

  override def parse(str: String):PriceObservation = {
    str match {
      case re(date, assetId, balance) => {
        PriceObservation(parseDate(date), AssetId(assetId), balance)
      }
    }
  }

}