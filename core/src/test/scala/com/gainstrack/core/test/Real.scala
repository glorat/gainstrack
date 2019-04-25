package com.gainstrack.core.test

import com.gainstrack.core.{BeancountGenerator, GainstrackParser}
import org.scalatest.FlatSpec

class Real extends FlatSpec {
  val parser = new GainstrackParser
  import scala.io.Source
  val src = Source.fromResource("real.gainstrack")
  src.getLines.foreach(parser.parseLine)

  val cmds = parser.getCommands

  val orderedCmds = cmds.sorted

  "Real case" should "generate beancount" in {
    val bg = new BeancountGenerator(orderedCmds)

    bg.writeFile("/tmp/real.beancount")
  }
}
