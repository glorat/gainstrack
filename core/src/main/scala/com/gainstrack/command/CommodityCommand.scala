package com.gainstrack.command

import com.gainstrack.core._

case class CommodityCommand(date: LocalDate, asset:AssetId, options:CommodityOptions, comments: Seq[String] = Seq()) extends AccountCommand with BeancountCommand {
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

  override def toPartialDTO: AccountCommandDTO = {
    AccountCommandDTO(accountId = AccountId.root, date = date, asset = Some(asset), options = Some(options.toDTO))
  }

  /** Commands should write
   * this.copy(comments = newComments)
   * */
  override def withComments(newComments: Seq[String]): AccountCommand = {
    copy(comments = newComments)
  }
}

object CommodityCommand extends CommandParser {
  import Patterns._
  val prefix: String = "commodity"
  val DEFAULT_DATE = parseDate("1900-01-01")

  private val Comm = s"${datePattern} ${prefix} $assetPattern".r

  override def parse(str: String): AccountCommand = {
    str match {
      case Comm(date, asset) =>
        CommodityCommand(parseDate(date), AssetId(asset), CommodityOptions())
    }
  }

  def apply(asset:AssetId) : CommodityCommand = {
    CommodityCommand(DEFAULT_DATE, asset, CommodityOptions())
  }
}