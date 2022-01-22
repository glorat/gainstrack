package com.gainstrack.core.test

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Paths}

import com.gainstrack.command.GainstrackParser
import com.gainstrack.core._
import com.gainstrack.report.{AccountInvestmentReport, AccountState, AssetChainMap, BalanceState, GainstrackGenerator, PLExplain, PriceFXConverter, SingleFXConverter, TransactionState}
import org.json4s.Formats
import org.scalatest.flatspec.AnyFlatSpec

class BalBug extends AnyFlatSpec {
  val parser = new GainstrackParser
  var bg:GainstrackGenerator = null

  "BalBug" should "parse balbug" in {
    import scala.io.Source
    parser.parseLines(Source.fromResource("balbug.gainstrack").getLines())

  }

  it should "generate gainstrack" in {
    bg = new GainstrackGenerator(parser.getCommands)
  }

  it should "generate json allstate" in {
    import org.json4s._
    import org.json4s.jackson.Serialization.write
    implicit val jsonFormats: Formats = org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all addKeySerializers GainstrackJsonSerializers.allKeys
    val str = write(bg.allState)
    val filename = "/tmp/balbug.json"
    Files.write(Paths.get(filename), str.getBytes(StandardCharsets.UTF_8))
  }

  it should "have expected bal 158085.55 CNY on 2021-08-11" in {
    val assets = bg.dailyBalances.convertedPosition("Assets:Bank:SC", parseDate("2021-08-11"),"CNY" )(bg.acctState, bg.assetChainMap, bg.tradeFXConversion)
    assert(assets.getBalance(AssetId("CNY")).number == 158085.55)
  }

}
