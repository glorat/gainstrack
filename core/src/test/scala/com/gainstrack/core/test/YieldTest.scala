package com.gainstrack.core.test

import com.gainstrack.command.GainstrackParser
import com.gainstrack.report.GainstrackGenerator
import org.scalatest.FlatSpec

//class YieldTest extends FlatSpec {
//  val parser = new GainstrackParser
//  import scala.io.Source
//  Source.fromResource("div.gainstrack").getLines.foreach(parser.parseLine)
//  val cmds = parser.getCommands
//  val bg = new GainstrackGenerator(cmds)
//
//  "yield commands" should "generate beancount" in {
//    import sys.process._
//    val bFile = "/tmp/div.beancount"
//    bg.writeFile(bFile)
//    val output = s"bean-check ${bFile}" !!
//
//    assert(output == "")
//  }
//}
