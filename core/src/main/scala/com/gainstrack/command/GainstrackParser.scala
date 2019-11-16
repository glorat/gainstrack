package com.gainstrack.command

import com.gainstrack.core.AccountCommand

import scala.collection.SortedSet
import scala.io.{BufferedSource, Source}

class GainstrackParser {
  // We start with just the global state
  private var globalCommand = GlobalCommand()
  private var commands:Seq[AccountCommand] = Seq()
  private var errors:Seq[ParserMessage] = Seq()
  private var lineCount : Int = 0
  def getCommands : SortedSet[AccountCommand] = {
    val ret = SortedSet[AccountCommand]() + globalCommand ++ commands
    require(commands.size+1 == ret.size, "Internal error: two different commands compared equal")
    ret
  }

  def parserErrors:Seq[ParserMessage] = errors

  val parsers:Map[String, CommandParser] = Map (
    "open" -> AccountCreation,
    "earn" -> EarnCommand,
    "tfr" -> Transfer,
    "trade" -> SecurityPurchase,
    "adj" -> BalanceAdjustment,
    "price" -> PriceObservation,
    "unit" -> UnitTrustBalance,
    "fund" -> FundCommand,
    "yield" -> YieldCommand,
    "commodity" -> CommodityCommand
  )

  import com.gainstrack.command.Patterns._
  private val prefix = raw"(\w+)"
  private val AccountCommand =s"${datePattern} ${prefix}.*".r
  private val OptionCommandPattern = s"""^option "${prefix}" "(.*)"""".r
  private val Metadata = s"\\s*([a-z][A-Za-z0-9_-]+):\\s*(.*)".r
  private val CommentLine = "[;#].*".r
  private val IgnoreLine = "^\\w*$".r

  private def tryParseLine(fullLine:String) : Unit = {
    lineCount += 1

    val line = fullLine.trim

    line match {
      case AccountCommand(dateStr, prefix) => {
        if (parsers.contains(prefix)) {
          try {
            val newCmd = parsers(prefix).parse(line)
            commands = commands :+ newCmd
            Some(newCmd)
          }
          catch {
            case m: MatchError => {
              errors = errors :+ ParserMessage(s"${prefix} command cannot be parsed", lineCount, line)
              throw new IllegalArgumentException(errors.last.message)
            }
          }

        }
        else {
          errors = errors :+ ParserMessage(s"${prefix} is an unknown command", lineCount, line)
          throw new IllegalArgumentException(errors.last.message)
        }


      }
      case Metadata(key, valueStr) => {
        val newLast = commands.lastOption.map(_.withOption(key, valueStr)).map(newLast => {
          commands = commands.dropRight(1) :+ newLast
          Some(newLast)
        }).getOrElse({
          errors = errors :+ ParserMessage(s"Cannot apply $key to ${prefix} command", lineCount, line)
          throw new IllegalStateException(errors.last.message)
        })

      }
      case OptionCommandPattern(key, valueStr) => {
        globalCommand = globalCommand.withOption(key, valueStr)
      }
      case CommentLine() => ()
      case IgnoreLine() => ()
      case _ => {
        errors = errors :+ ParserMessage(s"Unparsable: ${line}", lineCount, line)
        throw new Exception(errors.last.message)
        //None
      }
    }
  }

  def parseLine(line:String) : Unit = {
    try {
      tryParseLine(line)
    }
    catch {

      case e:Exception => {
        throw new Exception(s"Parsing failed on line ${lineCount}: ${line}", e)
      }
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

case class ParserMessage(message:String, line:Int, input:String, command:Option[AccountCommand]=None) // + severity?