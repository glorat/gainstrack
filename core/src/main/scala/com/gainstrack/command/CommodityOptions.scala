package com.gainstrack.command

import com.gainstrack.core.AccountId

case class CommodityOptions (
                              name:String = "",
                              category: String = "",
                              priceSource: String = ""
                            ) extends CommandOptions {

  def withOption(key: String, valueStr: String): CommodityOptions = {
    key match {
      case "name" => copy(name = valueStr)
      case "category" => copy(category = valueStr)
      case "priceSource" => copy(priceSource = valueStr)
      case _ => throw new IllegalArgumentException(s"Unknown option: ${key}")
    }
  }

  def toGainstrack: Seq[String] = {
    stringStr("name", name) ++
      stringStr("category", category) ++
      stringStr("priceSource", priceSource)
  }
}
