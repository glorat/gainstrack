package com.gainstrack.core.test

import java.time.LocalDate

import com.gainstrack.core._
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

  val queryDate = java.time.LocalDate.now

  it should "calculate IRR for investment accounts" in {
    val assetClasses = Seq("Bank","ISA","Property", "Investment")

    val test = (acctId:String) => {assetClasses.foldLeft(false)((bool:Boolean,str:AccountId) => bool || acctId.startsWith("Assets:"+str))}

    val invs = orderedCmds.filter(cmd => cmd match {
      case ac : AccountCreation => test(ac.accountId)
      case _ => false
    })

    val invAccts = invs.map(_.asInstanceOf[AccountCreation])
    //assert(invAccts.map(_.accountId) == Seq("Assets:Investment:NationwideUTM", "Assets:Investment:HSBC", "Assets:Investment:Zurich", "Assets:Investment:IBUSD", "Assets:Investment:IBGBP"))

    invAccts.foreach(account => {
      val accountId = account.accountId
      val ccy = account.key.assetId
      val accountReport = new AccountReport(accountId, ccy, queryDate, bg, priceCollector)
      println(s"${accountId} ${accountReport.balance}")
      accountReport.cashflowTable.sorted.foreach(cf => {
        println(s"   ${cf.date} ${cf.value}")
      })
      println(f"IRR: ${100*accountReport.cashflowTable.irr}%1.2f%%")

    })
  }

  it should "calc sane irrs for my Zurich" in {
    val rep = new AccountReport("Assets:Investment:Zurich", AssetId("GBP"), queryDate, bg, priceCollector)
    assert(rep.cashflowTable.irr < 0.05)
    assert(rep.cashflowTable.irr > 0.04)
  }

  it should "calc sane irrs for my PP" in {
    val rep = new AccountReport("Assets:Property:PP", AssetId("GBP"), queryDate, bg, priceCollector)
    assert(rep.cashflowTable.irr < 0.09)
    assert(rep.cashflowTable.irr > 0.03)
  }
}
