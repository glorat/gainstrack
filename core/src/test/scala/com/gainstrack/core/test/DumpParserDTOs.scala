package com.gainstrack.core.test

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Paths}

import com.gainstrack.command.GainstrackParser
import com.gainstrack.core.GainstrackJsonSerializers
import org.json4s.Formats
import org.json4s.jackson.Serialization
import org.scalatest.flatspec.AnyFlatSpec

import scala.io.Source

/**
 * One-off golden generator for the TypeScript parser port. For each gainstrack resource
 * file, parses it and writes `getCommands.map(_.toDTO)` as JSON, using the same json4s
 * formats the web layer uses for `/api/allState` (so the shapes match `AllState.commands`).
 *
 * Run manually: sbt "core/testOnly com.gainstrack.core.test.DumpParserDTOs"
 * Outputs to client/src/lib/__tests__/fixtures/<name>.commands.json (+ a copy of the input).
 */
class DumpParserDTOs extends AnyFlatSpec {
  private implicit val formats: Formats =
    org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all addKeySerializers GainstrackJsonSerializers.allKeys

  private val outDir = Paths.get("client/src/lib/__tests__/fixtures")

  // Resource files that the parser accepts (todo.gainstrack is legacy beancount, excluded).
  private val resources = Seq(
    "basic", "unit", "src", "div", "balbug", "james", "noequity", "multiadj",
  )

  "parser DTO goldens" should "be generated for each resource" in {
    assume(sys.props.contains("dumpFixtures"), "golden dump — run with -DdumpFixtures=1")
    Files.createDirectories(outDir)
    resources.foreach { name =>
      val text = Source.fromResource(s"$name.gainstrack").mkString
      val parser = new GainstrackParser
      parser.parseString(text)
      val dtos = parser.getCommands.map(_.toDTO)
      val json = Serialization.writePretty(dtos)

      Files.write(outDir.resolve(s"$name.commands.json"), json.getBytes(StandardCharsets.UTF_8))
      Files.write(outDir.resolve(s"$name.gainstrack"), text.getBytes(StandardCharsets.UTF_8))
      info(s"wrote $name (${dtos.size} commands)")
    }
  }
}
