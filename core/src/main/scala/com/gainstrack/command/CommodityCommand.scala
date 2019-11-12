package com.gainstrack.command

import com.gainstrack.core._

case class CommodityCommand(date: LocalDate, asset:AssetId) extends AccountCommand with BeancountCommand {
  override def commandString: String = CommodityCommand.prefix

  override def description: String = asset.symbol

  override def toGainstrack: Seq[String] = {
    Seq(s"${date} commodity ${asset.symbol}")
  }

  override def mainAccount: Option[AccountId] = None

  override def involvedAccounts: Set[AccountId] = Set()

  override def origin: AccountCommand = this

  override def toBeancount: Seq[BeancountLine] = toGainstrack.map(BeancountLine(_, this))
}

object CommodityCommand extends CommandParser {
  import Patterns._
  val prefix: String = "commodity"

  private val Comm = s"${datePattern} commodity $assetPattern".r

  override def parse(str: String): AccountCommand = {
    str match {
      case Comm(date, asset) =>
        CommodityCommand(parseDate(date), AssetId(asset))
    }
  }
}