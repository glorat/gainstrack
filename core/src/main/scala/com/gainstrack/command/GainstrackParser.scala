package com.gainstrack.command

import com.gainstrack.core.AccountCommand

import scala.io.Source

class GainstrackParser {
  private var commands:Seq[AccountCommand] = Seq()
  private var lineCount : Int = 0
  def getCommands : Seq[AccountCommand] = commands.sorted

  val parsers:Map[String, CommandParser] = Map (
    "open" -> AccountCreation,
    "earn" -> Transfer,
    "tfr" -> Transfer,
    "trade" -> SecurityPurchase,
    "adj" -> BalanceAdjustment,
    "price" -> PriceObservation,
    "unit" -> UnitTrustBalance,
    "fund" -> FundCommand
  )

  import com.gainstrack.command.Patterns._
  private val prefix = raw"(\w+)"
  private val AccountCommand =s"${datePattern} ${prefix}.*".r
  private val Metadata = s"\\s*([a-z][A-Za-z0-9_-]+):\\s*(.*)".r


  private def tryParseLine(line:String) : Option[AccountCommand] = {
    lineCount += 1

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

  def parseLine(line:String) : Option[AccountCommand] = {
    try {
      tryParseLine(line)
    }
    catch {
      case e:Exception => throw new Exception(s"Parsing failed on line ${lineCount}: ${line}", e)
    }
  }

  def parseFile(filename:String) : Unit = {
    val src = Source.fromFile(filename)
    src.getLines.foreach(this.parseLine)
  }
}
