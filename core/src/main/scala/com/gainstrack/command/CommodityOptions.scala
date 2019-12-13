package com.gainstrack.command

import com.gainstrack.core.AccountId

import scala.collection.SortedMap

case class CommodityOptions (
                              name:String = "",
                              tags:Set[String] = Set(),
                              category: String = "",
                              priceSource: String = "",
                              options: SortedMap[String, String] = SortedMap()
                            ) extends CommandOptions {

  def withOption(key: String, valueStr: String): CommodityOptions = {
    key match {
      case "name" => copy(name = valueStr)
      case "category" => copy(category = valueStr)
      case "priceSource" => copy(priceSource = valueStr)
      case "tags" => copy(tags = valueStr.split(",").map(_.trim).toSet)
      case _ => copy(options = options.updated(key, valueStr))
    }
  }

  def toGainstrack: Seq[String] = {
    stringStr("name", name) ++
      setStr("tags", tags) ++
      stringStr("category", category) ++
      stringStr("priceSource", priceSource) ++
      this.options.flatMap(kv => stringStr(kv._1, kv._2))
  }
}
