package com.gainstrack.command

import com.gainstrack.core._

case class PriceObservation(date:LocalDate, assetId: AssetId, price:Amount, myOrigin:Option[AccountCommand]=None)
  extends AccountCommand with BeancountCommand {
  override def commandString: String = PriceObservation.prefix
  override def mainAccount: Option[AccountId] = None
  override def involvedAccounts: Set[AccountId] = Set()
  override def origin: AccountCommand = myOrigin.getOrElse(this)
  def description:String = s"${price.ccy.symbol}/${assetId.symbol} = ${price}"

  def toBeancount : Seq[BeancountLine] = {
     BeancountLines(s"${date} price ${assetId.symbol} ${price}", origin)
  }

  override def toGainstrack: Seq[String] = {
    toBeancount.map(_.value)
  }

  override def toPartialDTO: AccountCommandDTO = AccountCommandDTO(accountId = AccountId.root, date = date, price = Some(price), asset = Some(assetId))
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