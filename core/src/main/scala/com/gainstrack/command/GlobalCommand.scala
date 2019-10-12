package com.gainstrack.command

import com.gainstrack.core._

case class GlobalCommand(operatingCurrency:AssetId = AssetId("USD")) extends AccountCommand {
  override def date: LocalDate = MinDate

  override def description: String = "global configuration"

  override def toGainstrack: Seq[String] = {
    var ret = Seq[String]()
    if (operatingCurrency != AssetId("USD")) {
      ret = ret :+ s"""option "operating_currency" "${operatingCurrency.symbol}""""
    }
    ret
  }

  override def mainAccount: Option[AccountId] = None

  override def involvedAccounts: Set[AccountId] = Set()

  override def withOption(key: String, valueStr: String): GlobalCommand = {
    key match {
      case "operating_currency" => copy(operatingCurrency = AssetId(valueStr))
      case _ => ???
    }
  }
}
