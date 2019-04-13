package com.gainstrack.core


trait CommandParser {
  def parse(str:String) : AccountCommand
  def prefix : String
}

object CommandParser {
  val parsers:Map[String, CommandParser] = Map (
    "open" -> AccountCreation,
    "tfr" -> Transfer,
    "trade" -> SecurityPurchase,
    "adj" -> BalanceAdjustment
  )

  import Patterns._
  private val prefix = raw"(\w+)"
  private val re =s"${datePattern} ${prefix}.*".r


  def parseLine(line:String) : Option[AccountCommand] = {
    line match {
      case re(dateStr, prefix) => {
        require(parsers.contains(prefix), s"${prefix} is an unknown command")
        Some(parsers(prefix).parse(line))
      }
      case _ => None
    }
  }
}
