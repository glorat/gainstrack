package com.gainstrack.command

import com.gainstrack.core.AccountId

case class CommodityOptions (
                              name:String = "",
                              tags:Set[String] = Set(),
                              category: String = "",
                              priceSource: String = ""
                            ) extends CommandOptions {

  def withOption(key: String, valueStr: String): CommodityOptions = {
    key match {
      case "name" => copy(name = valueStr)
      case "category" => copy(category = valueStr)
      case "priceSource" => copy(priceSource = valueStr)
      case "tags" => copy(tags = valueStr.split(",").map(_.trim).toSet)
      case _ => throw new IllegalArgumentException(s"Unknown option: ${key}")
    }
  }

  def toGainstrack: Seq[String] = {
    stringStr("name", name) ++
    setStr("tags", tags) ++
      stringStr("category", category) ++
      stringStr("priceSource", priceSource)
  }
}
