package com.gainstrack.command

import com.gainstrack.core.{AccountCommand, AssetId, Balance, BeancountCommand, LocalDate, parseDate}

case class PriceObservation(date:LocalDate, assetId: AssetId, price:Balance)
  extends AccountCommand with BeancountCommand {
  def toBeancount : String = {
     s"${date} price ${assetId.symbol} ${price}"
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