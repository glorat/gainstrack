package com.gainstrack.core

class GainstrackParser {
  private var commands:Seq[AccountCommand] = Seq()
  def getCommands : Seq[AccountCommand] = commands

  val parsers:Map[String, CommandParser] = Map (
    "open" -> AccountCreation,
    "tfr" -> Transfer,
    "trade" -> SecurityPurchase,
    "adj" -> BalanceAdjustment
  )

  import Patterns._
  private val prefix = raw"(\w+)"
  private val AccountCommand =s"${datePattern} ${prefix}.*".r
  private val Metadata = s"\\s*([a-z][A-Za-z0-9_-]+):\\s*(.*)".r


  def parseLine(line:String) : Option[AccountCommand] = {
    line match {
      case AccountCommand(dateStr, prefix) => {
        require(parsers.contains(prefix), s"${prefix} is an unknown command")
        val newCmd = parsers(prefix).parse(line)
        commands = commands :+ newCmd
        Some(newCmd)
      }
      case Metadata(key, valueStr) => {
        val newLast = commands.lastOption.getOrElse(throw new IllegalStateException("Options must be given to a command")).withOption(key, valueStr)
        commands = commands.dropRight(1) :+ newLast
        Some(newLast)
      }
      case _ => None
    }
  }
}
