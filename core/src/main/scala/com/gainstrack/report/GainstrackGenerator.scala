package com.gainstrack.report

import com.gainstrack.core._
import com.gainstrack.command._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}

import scala.collection.SortedSet


case class GainstrackGenerator(originalCommands:SortedSet[AccountCommand])  {

  // First pass for accounts
  val acctState:AccountState =
    originalCommands.foldLeft(AccountState()) ((state, ev) => state.handle(ev))
  // Fill in defaulted accounts
  private val expander =
    originalCommands.foldLeft(CommandAccountExpander(acctState.accounts)) ((state, ev) => state.handle(ev))
  val finalCommands = expander.cmds

  // Second pass for balances
  val balanceState:BalanceState =
    finalCommands.foldLeft(BalanceState(acctState.accounts)) ( (state,ev) => state.handle(ev))

  // Third pass for projections
  val txState:TransactionState =
    finalCommands.foldLeft(TransactionState(acctState.accounts, balanceState, Seq())) ((state, ev) => state.handle(ev))
  lazy val priceState: PriceState =
    finalCommands.foldLeft(PriceState()) ((state,ev) => state.handle(ev))

    //     val machine = new PriceCollector
  //    orderedCmds.foreach(cmd => {
  //      machine.applyChange(cmd)
  //    })
  //    machine
  def addCommand(cmd:AccountCommand) : GainstrackGenerator = {
    // Cannot use .contains because that seems to use a ref equals
    // whereas we want a value object equals
    require(originalCommands.filter(_ == cmd).size==0, "command already exists. Duplicates not allowed")
    GainstrackGenerator( (originalCommands + cmd))
  }

  def removeCommand(cmd:AccountCommand): GainstrackGenerator = {
    require(originalCommands.contains(cmd), "command being removed doesn't exist")
    GainstrackGenerator(originalCommands.filterNot(_ == cmd))
  }

  case object GainstrackTemplate extends AccountCommand {
    def date: LocalDate = MinDate

    def description: String = "System generated"

    def toGainstrack: Seq[String] = Seq("")

    def mainAccount: Option[AccountId] = None

    def involvedAccounts: Set[AccountId] = Set()
  }

  def toBeancount: Seq[BeancountLine] = {
    val headers:Seq[BeancountLine] = BeancountLines(Seq (
      "option \"title\" \"Gainstrack\"",
      "option \"operating_currency\" \"GBP\"",
      "plugin \"beancount.plugins.implicit_prices\""
    ), GainstrackTemplate)

    val accts:Seq[BeancountLine] = acctState.accounts.flatMap(_.toBeancount).toSeq
    val cmds:Seq[BeancountLine] = txState.cmds.map(_.toBeancount).flatten
    val lines:Seq[BeancountLine] = headers ++ accts ++ cmds

    lines
  }

  def writeBeancountFile(filename:String):Unit = {
    import java.nio.file.{Paths, Files}
    import java.nio.charset.StandardCharsets
    import sys.process._

    val bcs = this.toBeancount
    val str = bcs.map(_.value).mkString("\n")
    Files.write(Paths.get(filename), str.getBytes(StandardCharsets.UTF_8))
    // Automatically check for correctness

    var stdout = scala.collection.mutable.MutableList[String]()
    val logger = ProcessLogger(line => stdout.+=(line), line=>stdout+=line )
    val exitCode = s"bean-check ${filename}" ! logger

    if (exitCode != 0) {
      val errLines = stdout.filter(_.startsWith(filename))
      val BcParse = (filename + raw":([0-9]+):\s+(.*)").r
      val orig = bcs
      errLines.foreach(line => {
        line match {
          case BcParse(lineNumber,message) => {
            println(orig(parseNumber(lineNumber).toInt-1).origin.toGainstrack)
            println (message)
          }
        }

      })
      throw new IllegalStateException("There are errors in the inputs")
    }

  }

  def writeGainstrackFile(filename:String): Unit = {
    import java.nio.file.{Paths, Files}
    import java.nio.charset.StandardCharsets
    val str: String = toGainstrack
    Files.write(Paths.get(filename), str.getBytes(StandardCharsets.UTF_8))

  }

  def toGainstrack: String = {
    val grp = originalCommands.toSeq.groupBy(_.mainAccount.getOrElse(AccountId("")))
    val accids = grp.keys.toSeq.sorted
    val str = accids.map(grp(_).flatMap(_.toGainstrack).mkString("\n")).mkString("\n\n")
    str
  }
}

