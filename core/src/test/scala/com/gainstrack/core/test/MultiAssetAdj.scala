package com.gainstrack.core.test

import com.gainstrack.command.{AccountCreation, BalanceAdjustment, GainstrackParser, GlobalCommand, Transfer}
import com.gainstrack.core._
import com.gainstrack.report._
import org.scalatest.FlatSpec


class MultiAssetAdj extends FlatSpec {
  val parser = new GainstrackParser
  "parser" should "parse multiasset adj command" in {
    import scala.io.Source
    parser.parseLines(Source.fromResource("multiadj.gainstrack").getLines)

  }

  it should "generate valid beancount" in {
    val bg = new GainstrackGenerator(parser.getCommands)
    val res = bg.writeBeancountFile(s"/tmp/multiadj.beancount", parser.lineFor(_))
    assert(res.length == 0)
  }
}
