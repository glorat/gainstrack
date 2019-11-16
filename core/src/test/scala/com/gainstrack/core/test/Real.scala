package com.gainstrack.core.test

import java.io.File
import java.nio.file.{Files, Paths}

import com.gainstrack.command._
import com.gainstrack.core._
import com.gainstrack.report.{AccountInvestmentReport, GainstrackGenerator, PriceState}
import org.scalatest.{BeforeAndAfterEach, FlatSpec, Ignore, Tag}

import scala.collection.SortedSet

object RealDataAvailable extends Tag(if (Files.exists(Paths.get( s"data/real.gainstrack"))) "" else classOf[Ignore].getName)


class Real extends FlatSpec with BeforeAndAfterEach {
  val parser = new GainstrackParser
  val realFile = "real"

  "parser" should "parseFile" taggedAs RealDataAvailable in {
    parser.parseFile(s"data/${realFile}.gainstrack")
  }

  it should "roundtrip" taggedAs RealDataAvailable in {
    val cmds = parser.getCommands
    cmds.foreach(cmd => {
      val p = new GainstrackParser

      val strs = cmd.toGainstrack
      p.parseLines(strs)

      assert(cmd == p.getCommands.last)

    })
  }

  "Real case" should "generate beancount" taggedAs RealDataAvailable in {
    val bg = new GainstrackGenerator(parser.getCommands)
    bg.writeBeancountFile(s"/tmp/${realFile}.beancount")
  }

  it should "imply prices" taggedAs RealDataAvailable in {
    val bg = new GainstrackGenerator(parser.getCommands)
    lazy val priceState : PriceState = bg.priceState
    priceState
  }

  val fromDate = parseDate("1980-01-01")
  val queryDate = java.time.LocalDate.now

  it should "calculate IRR for investment accounts" taggedAs RealDataAvailable in {
    val bg = new GainstrackGenerator(parser.getCommands)
    val assetClasses = Seq("Bank","ISA","Property", "Investment")

    // FIXME: Don't check AccountId.name
    val test = (acctId:AccountId) => {assetClasses.foldLeft(false)((bool:Boolean,str:String) => bool || acctId.isSubAccountOf(AccountId("Assets:"+str)))}

    val invs = parser.getCommands.filter(cmd => cmd match {
      case ac : AccountCreation => test(ac.accountId)
      case _ => false
    })

    val invAccts = invs.map(_.asInstanceOf[AccountCreation])
    //assert(invAccts.map(_.accountId) == Seq("Assets:Investment:NationwideUTM", "Assets:Investment:HSBC", "Assets:Investment:Zurich", "Assets:Investment:IBUSD", "Assets:Investment:IBGBP"))

    invAccts.foreach(account => {
      val accountId = account.accountId
      val ccy = account.key.assetId
      val accountReport = new AccountInvestmentReport(accountId, ccy, fromDate, queryDate, bg.acctState, bg.balanceState, bg.txState, bg.priceState)
      println(s"${accountId} ${accountReport.endBalance}")
      accountReport.cashflowTable.sorted.foreach(cf => {
        println(s"   ${cf.date} ${cf.value}")
      })
      println(f"IRR: ${100*accountReport.cashflowTable.irr}%1.2f%%")

    })
  }

  it should "calc sane irrs for my Zurich" taggedAs RealDataAvailable in {
    val bg = new GainstrackGenerator(parser.getCommands)
    val accountId = AccountId("Assets:Investment:Zurich")
    val rep = new AccountInvestmentReport(accountId, AssetId("GBP"), fromDate, queryDate, bg.acctState, bg.balanceState, bg.txState, bg.priceState)

    assert(rep.cashflowTable.irr < 0.062)
    assert(rep.cashflowTable.irr > 0.044)
  }

  it should "calc sane irrs for my PP" taggedAs RealDataAvailable in {
    val bg = new GainstrackGenerator(parser.getCommands)
    val accountId = AccountId("Assets:Property:PP")
    val rep = new AccountInvestmentReport(accountId, AssetId("GBP"), fromDate, queryDate, bg.acctState, bg.balanceState, bg.txState, bg.priceState)

    assert(rep.cashflowTable.irr < 0.09)
    assert(rep.cashflowTable.irr > 0.03)
  }

  it should "list all txs for an account" taggedAs RealDataAvailable in {
    val bg = new GainstrackGenerator(parser.getCommands)
    val accountId = AccountId("Assets:Investment:HSBC")
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
