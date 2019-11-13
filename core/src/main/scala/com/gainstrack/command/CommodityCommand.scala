package com.gainstrack.command

import com.gainstrack.core._

case class CommodityCommand(date: LocalDate, asset:AssetId, options:CommodityOptions) extends AccountCommand with BeancountCommand {
  override def commandString: String = CommodityCommand.prefix

  override def description: String = asset.symbol

  override def toGainstrack: Seq[String] = {
    s"${date} ${commandString} ${asset.symbol}" +: options.toGainstrack
  }

  override def mainAccount: Option[AccountId] = None

  override def involvedAccounts: Set[AccountId] = Set()

  override def origin: AccountCommand = this

  override def toBeancount: Seq[BeancountLine] = {
    ???
  }

  override def withOption(key: String, valueStr: String): AccountCommand = {
    copy (options = options.withOption(key, valueStr))
  }
}

object CommodityCommand extends CommandParser {
  import Patterns._
  val prefix: String = "commodity"

  private val Comm = s"${datePattern} ${prefix} $assetPattern".r

  override def parse(str: String): AccountCommand = {
    str match {
      case Comm(date, asset) =>
        CommodityCommand(parseDate(date), AssetId(asset), CommodityOptions())
    }
  }
}