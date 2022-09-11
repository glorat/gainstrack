package com.gainstrack.command

import com.gainstrack.core.AccountId

import scala.collection.immutable.SortedMap

case class CommodityOptions (
                              name:String = "",
                              tags:Set[String] = Set(),
                              ticker: String = "",
                              options: SortedMap[String, String] = SortedMap()
                            ) extends CommandOptions {

  def toDTO: Map[String,Object] = {
    options.toMap + ("name" -> name) +
      ("ticker" -> ticker) +
      ("tags" -> tags.toSeq)
  }

  def get(key: String): Option[String] = {
    key match {
      case "name" => Some(name)
      case "tags" => ???
      case "ticker" => if (ticker.isEmpty) None else Some(ticker)
      case x => options.get(x)
    }
  }

  def withOption(key: String, valueStr: String): CommodityOptions = {
    key match {
      case "name" => copy(name = valueStr)
      case "ticker" => copy(ticker = valueStr)
      case "tags" => copy(tags = valueStr.split(",").map(_.trim).toSet)
      case _ => copy(options = options.updated(key, valueStr))
    }
  }

  def toGainstrack: Seq[String] = {
    stringStr("name", name) ++
      setStr("tags", tags) ++
      stringStr("ticker", ticker) ++
      this.options.flatMap(kv => stringStr(kv._1, kv._2))
  }
}
