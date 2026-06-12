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
 * Differential-test oracle for the TypeScript parser port. Reads a shared corpus of input
 * snippets (parser_cases.txt) and, for each, records the Scala parser's BEHAVIOUR:
 *   - "ok"    : parsed cleanly; emits the resulting toDTO commands
 *   - "error" : produced collected ParserMessage(s) (the expected failure path)
 *   - "crash" : threw something that was NOT collected as a parser error (a bug surface)
 *
 * The TS test (GainstrackParserDiff.jest.spec.ts) runs the same corpus and asserts identical
 * status for every case (and identical commands for "ok" cases).
 *
 * Run manually: sbt "core/testOnly com.gainstrack.core.test.DumpParserCases"
 */
class DumpParserCases extends AnyFlatSpec {
  private implicit val formats: Formats =
    org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all addKeySerializers GainstrackJsonSerializers.allKeys

  private val fixtures = Paths.get("client/src/lib/__tests__/fixtures")

  private case class Case(id: String, body: String)

  private def readCases(): Seq[Case] = {
    val raw = Source.fromFile(fixtures.resolve("parser_cases.txt").toFile).mkString
    // Split on lines like "### id: <name>"; keep id + the body until the next marker.
    val marker = "(?m)^### id: (.+)$".r
    val parts = marker.split(raw)            // text before first marker is dropped
    val ids = marker.findAllMatchIn(raw).map(_.group(1).trim).toSeq
    ids.zip(parts.drop(1)).map { case (id, body) => Case(id, body.stripPrefix("\n")) }
  }

  "parser case behaviours" should "be recorded for the differential test" in {
    assume(sys.props.contains("dumpFixtures"), "golden dump — run with -DdumpFixtures=1")
    val results = readCases().map { c =>
      val parser = new GainstrackParser
      try {
        parser.parseString(c.body)
        val dtos = parser.getCommands.map(_.toDTO)
        Map[String, Any]("id" -> c.id, "status" -> "ok", "commands" -> dtos)
      } catch {
        case _: Throwable =>
          val status = if (parser.parserErrors.nonEmpty) "error" else "crash"
          Map[String, Any]("id" -> c.id, "status" -> status)
      }
    }

    val json = Serialization.writePretty(results)
    Files.write(fixtures.resolve("parser_cases.expected.json"), json.getBytes(StandardCharsets.UTF_8))
    info(s"recorded ${results.size} case behaviours")
    results.foreach(r => info(s"  ${r("id")} => ${r("status")}"))
  }
}
