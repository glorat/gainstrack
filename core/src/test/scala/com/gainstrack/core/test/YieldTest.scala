package com.gainstrack.core.test

import com.gainstrack.command.GainstrackParser
import com.gainstrack.report.GainstrackGenerator
import org.scalatest.flatspec.AnyFlatSpec

class YieldTest extends AnyFlatSpec {
  val parser = new GainstrackParser
  var bg:GainstrackGenerator = null

  "yield commeands" should "parse" in {
    import scala.io.Source
    parser.parseLines(Source.fromResource("div.gainstrack").getLines)

  }

  it should "generate gainstrack" in {
    bg = new GainstrackGenerator(parser.getCommands)
  }

  it should "generate beancount" in {
    val bFile = "/tmp/div.beancount"
    val errs = bg.writeBeancountFile(bFile, parser.lineFor(_))
    assert(errs.length == 0)
  }

}
