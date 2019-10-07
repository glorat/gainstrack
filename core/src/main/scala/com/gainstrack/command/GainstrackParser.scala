package com.gainstrack.command

import com.gainstrack.core.AccountCommand

import scala.collection.SortedSet
import scala.io.{BufferedSource, Source}

class GainstrackParser {
  private var commands:Seq[AccountCommand] = Seq()
  private var lineCount : Int = 0
  def getCommands : SortedSet[AccountCommand] = {
    val ret = SortedSet[AccountCommand]() ++ commands
    require(commands.size == ret.size, "Internal error: two different commands compared equal")
    ret
  }

  val parsers:Map[String, CommandParser] = Map (
    "open" -> AccountCreation,
    "earn" -> EarnCommand,
    "tfr" -> Transfer,
    "trade" -> SecurityPurchase,
    "adj" -> BalanceAdjustment,
    "price" -> PriceObservation,
    "unit" -> UnitTrustBalance,
    "fund" -> FundCommand,
    "yield" -> YieldCommand
  )

  import com.gainstrack.command.Patterns._
  private val prefix = raw"(\w+)"
  private val AccountCommand =s"${datePattern} ${prefix}.*".r
  private val Metadata = s"\\s*([a-z][A-Za-z0-9_-]+):\\s*(.*)".r


  private def tryParseLine(line:String) : Unit = {
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

  def parseLine(line:String) : Unit = {
    try {
      tryParseLine(line)
    }
    catch {
      case e:Exception => throw new Exception(s"Parsing failed on line ${lineCount}: ${line}", e)
    }
  }

  def parseFile(filename:String) : Unit = {
    val src = Source.fromFile(filename)
    parseBuffer(src)
  }

  def parseString(str:String) : Unit = {
    val src = Source.fromString(str)
    parseBuffer(src)
  }

  private def parseBuffer(src: Source) = {
    src.getLines.foreach(this.parseLine)
  }
}
