package com.gainstrack.command

import com.gainstrack.core.AccountCommand

import scala.collection.immutable.SortedSet

import scala.io.{BufferedSource, Source}

class GainstrackParser {
  // We start with just the global state
  private var globalCommand:Option[GlobalCommand] = None
  private var commands:Seq[AccountCommand] = Seq()
  private var errors:Seq[ParserMessage] = Seq()
  private var lineCount : Int = 0
  private var commandToLocation: Map[AccountCommand, Int] = Map()

  def getCommands : Seq[AccountCommand] = {
    val ret = Seq[AccountCommand]() ++ globalCommand ++ commands
    AccountCommand.sorted(ret)
  }

  def lineFor(cmd:AccountCommand) : Int = {
    commandToLocation.get(cmd).getOrElse(0)
  }

  def sourceMap: AccountCommand => Int = this.lineFor(_)

  def parserErrors:Seq[ParserMessage] = errors

  val parsers:Map[String, CommandParser] = Map (
    "open" -> AccountCreation,
    "earn" -> EarnCommand,
    "spend" -> SpendCommand,
    "tfr" -> Transfer,
    "trade" -> SecurityPurchase,
    "adj" -> BalanceAdjustment,
    "bal" -> BalanceStatement,
    "price" -> PriceObservation,
    "unit" -> UnitTrustBalance,
    "fund" -> FundCommand,
    "yield" -> YieldCommand,
    "commodity" -> CommodityCommand
  )

  import com.gainstrack.command.Patterns._
  private val prefix = raw"(\w+)"
  private val AccountCommandPattern =s"${datePattern} ${prefix}.*".r
  private val OptionCommandPattern = s"""^option "${prefix}" "(.*)"""".r
  private val Metadata = s"\\s*([a-z][A-Za-z0-9_-]+):\\s*(.*)".r
  private val CommentLine = "[;#].*".r
  private val IgnoreLine = "^\\w*$".r

  private def tryParseLine(fullLine:String) : Unit = {
    lineCount += 1

    val line = fullLine.trim

    line match {
      case AccountCommandPattern(dateStr, prefix) => {
        if (parsers.contains(prefix)) {
          try {
            val newCmd = parsers(prefix).parse(line)
            commands = commands :+ newCmd
            commandToLocation = commandToLocation + (newCmd -> lineCount)
          }
          catch {
            case m: MatchError => {
              errors = errors :+ ParserMessage(s"${prefix} command cannot be parsed", lineCount, line)
            }
          }

        }
        else {
          errors = errors :+ ParserMessage(s"${prefix} is an unknown command", lineCount, line)
        }


      }
      case Metadata(key, valueStr) => {
        val newLast = commands.lastOption.map(_.withOption(key, valueStr)).map(newLast => {
          commands = commands.dropRight(1) :+ newLast
          Some(newLast)
        }).getOrElse({
          errors = errors :+ ParserMessage(s"Cannot apply $key to ${commands.lastOption.map(_.toGainstrack).getOrElse("unknown")} command", lineCount, line)
        })

      }
      case OptionCommandPattern(key, valueStr) => {
        globalCommand = Some(globalCommand.getOrElse(GlobalCommand()).withOption(key, valueStr))
      }
      case CommentLine() => ()
      case IgnoreLine() => ()
      case _ => {
        errors = errors :+ ParserMessage(s"Unparsable: ${line}", lineCount, line)
        //None
      }
    }
  }

  private def parseLine(line:String) : Unit = {
    try {
      tryParseLine(line)
    }
    catch {

      case e:Exception => {
        val msg = s"Parsing failed on line ${lineCount}: ${line}: ${e.getMessage}"
        errors = errors :+ ParserMessage(msg,lineCount, line)
        throw new Exception(msg, e)
      }
    }
  }

  def parseLines(lines:TraversableOnce[String]) : Unit = {
    lines.foreach(tryParseLine)
    if (this.errors.length > 0) {
      throw new Exception("There were parsing errors")
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
    if (this.errors.length > 0) {
      throw new Exception("There were parsing errors")
    }
  }
}

case class ParserMessage(message:String, line:Int, input:String, command:Option[AccountCommand]=None) // + severity?