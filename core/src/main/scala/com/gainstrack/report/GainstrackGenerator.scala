package com.gainstrack.report

import com.gainstrack.core._
import com.gainstrack.command._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}

case class GainstrackGenerator(originalCommands:Seq[AccountCommand])  {

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

  def toBeancount: String = {
    val headers:Seq[String] = Seq (
      "option \"title\" \"Gainstrack\"",
      "option \"operating_currency\" \"GBP\"",
      "plugin \"beancount.plugins.implicit_prices\""
    )

    val lines = headers ++ acctState.accounts.map(_.toBeancount) ++ txState.cmds.map(_.toBeancount)

    lines.mkString("\n")
  }

  def writeBeancountFile(filename:String) = {
    import java.nio.file.{Paths, Files}
    import java.nio.charset.StandardCharsets

    val str = this.toBeancount
    Files.write(Paths.get(filename), str.getBytes(StandardCharsets.UTF_8))

  }

  def writeGainstrackFile(filename:String) = {
    import java.nio.file.{Paths, Files}
    import java.nio.charset.StandardCharsets


    val str = originalCommands.groupBy(_.mainAccount).values.map(_.map(_.toGainstrack).mkString("\n")).mkString("\n")
    
    Files.write(Paths.get(filename), str.getBytes(StandardCharsets.UTF_8))

  }
}

