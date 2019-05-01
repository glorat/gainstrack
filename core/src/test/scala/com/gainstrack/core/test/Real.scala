package com.gainstrack.core.test

import java.time.LocalDate

import com.gainstrack.core.{AccountCreation, AccountReport, BeancountGenerator, GainstrackParser, PriceCollector}
import org.scalatest.FlatSpec

class Real extends FlatSpec {
  val parser = new GainstrackParser
  import scala.io.Source

  val realFile = "real"

  val src = Source.fromResource(s"${realFile}.gainstrack")
  src.getLines.foreach(parser.parseLine)

  val cmds = parser.getCommands

  val orderedCmds = cmds.sorted
  val bg = new BeancountGenerator(orderedCmds)

  lazy val priceCollector : PriceCollector = {
    val machine = new PriceCollector
    orderedCmds.foreach(cmd => {
      machine.applyChange(cmd)
    })
    machine
  }


  "Real case" should "generate beancount" in {

    bg.writeFile(s"/tmp/${realFile}.beancount")
  }

  it should "imply prices" in {
    priceCollector
  }

  it should "pass bean-check" in {
    import sys.process._
    import java.nio.file.{Paths, Files}
    val output = s"bean-check /tmp/${realFile}.beancount" !!

    assert(output == "")
  }

  it should "calculate IRR for investment accounts" in {
    val invs = orderedCmds.filter(cmd => cmd match {
      case ac : AccountCreation => ac.accountId.startsWith("Assets:Investment")
      case _ => false
    })

    val invAccts = invs.map(_.asInstanceOf[AccountCreation])
    assert(invAccts.map(_.accountId) == Seq("Assets:Investment:NationwideUTM", "Assets:Investment:HSBC", "Assets:Investment:Zurich", "Assets:Investment:IBUSD", "Assets:Investment:IBGBP"))

    val queryDate = LocalDate.parse("2019-12-31")

    invAccts.foreach(account => {
      val accountId = account.accountId
      val ccy = account.key.assetId
      val accountReport = new AccountReport(accountId, ccy, queryDate, bg, priceCollector)
      println(s"${accountId} ${accountReport.balance} ${accountReport.cashflowTable.irr}")

    })




  }
}
