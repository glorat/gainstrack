package com.gainstrack.core.test

import com.gainstrack.command._
import com.gainstrack.core._
import com.gainstrack.report.{AccountInvestmentReport, GainstrackGenerator, PriceState}
import org.scalatest.FlatSpec

class Real extends FlatSpec {
  val parser = new GainstrackParser
  import scala.io.Source

  val realFile = "real"

  val src = Source.fromFile(s"data/${realFile}.gainstrack")
  src.getLines.foreach(parser.parseLine)

  val cmds = parser.getCommands

  val orderedCmds = cmds.sorted
  val bg = new GainstrackGenerator(orderedCmds)

  lazy val priceState : PriceState = bg.priceState

  "Real case" should "generate beancount" in {

    bg.writeFile(s"/tmp/${realFile}.beancount")
  }

  it should "imply prices" in {
    priceState
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
      val accountReport = new AccountInvestmentReport(accountId, ccy, queryDate, bg, priceState)
      println(s"${accountId} ${accountReport.balance}")
      accountReport.cashflowTable.sorted.foreach(cf => {
        println(s"   ${cf.date} ${cf.value}")
      })
      println(f"IRR: ${100*accountReport.cashflowTable.irr}%1.2f%%")

    })
  }

  it should "calc sane irrs for my Zurich" in {
    val rep = new AccountInvestmentReport("Assets:Investment:Zurich", AssetId("GBP"), queryDate, bg, priceState)
    assert(rep.cashflowTable.irr < 0.05)
    assert(rep.cashflowTable.irr > 0.04)
  }

  it should "calc sane irrs for my PP" in {
    val rep = new AccountInvestmentReport("Assets:Property:PP", AssetId("GBP"), queryDate, bg, priceState)
    assert(rep.cashflowTable.irr < 0.09)
    assert(rep.cashflowTable.irr > 0.03)
  }

  it should "list all txs for an account" in {
    val accountId = "Assets:Investment:HSBC"
    val txs = bg.txState.cmds.filter(bcmd => bcmd match {
      case tx:Transaction => tx.postings.find(p=>isSubAccountOf(p.account, accountId)).isDefined
      case _ => false
    }).map(_.asInstanceOf[Transaction])

    txs.map(tx => s"${tx.postDate} ${tx.description} ${tx.subBalanceChange(accountId).toDouble}")
      .foreach(println(_))
    /*val rep = new AccountReport("Assets:Investment:HSBC", AssetId("USD"), queryDate, bg, priceCollector)
    rep.allFlows.foreach(cf => {
      println(s"   ${cf.date} ${cf.value}")
    })*/
  }
}
