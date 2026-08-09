package com.gainstrack.core.test

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Paths}

import com.gainstrack.command.GainstrackParser
import com.gainstrack.report.GainstrackGenerator
import org.json4s.Formats
import org.json4s.jackson.Serialization
import org.scalatest.flatspec.AnyFlatSpec

import scala.io.Source

/**
 * Golden oracle for the TypeScript `toGainstrack` port (the write path).
 *
 * For each ledger, dumps `getCommands.map(_.toGainstrackWithComments)` — i.e. exactly the
 * `Seq[Seq[String]]` that `GainstrackEntity` persists as `cmdStrs` and that every event appended
 * to the Firestore stream carries. The TS side must produce these byte-for-byte or it will
 * corrupt ledgers rather than merely render them oddly.
 *
 * Run manually:
 *   sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpToGainstrack"
 *   sbt -DdumpFixtures=1 -DlocalGainstrack=<path> "core/testOnly ...DumpToGainstrack"
 */
class DumpToGainstrack extends AnyFlatSpec {
  private implicit val formats: Formats = org.json4s.DefaultFormats

  private val outDir = Paths.get("client/src/lib/__tests__/fixtures")
  private val localDir = outDir.resolve("local")

  private val resources = Fixtures.names

  private def blocksFor(text: String): Seq[Seq[String]] = {
    val parser = new GainstrackParser
    parser.parseString(text)
    parser.getCommands.map(_.toGainstrackWithComments).filter(_.nonEmpty)
  }

  private def write(path: java.nio.file.Path, blocks: Seq[Seq[String]]): Unit =
    Files.write(path, Serialization.writePretty(blocks).getBytes(StandardCharsets.UTF_8))

  private def writeText(path: java.nio.file.Path, text: String): Unit =
    Files.write(path, text.getBytes(StandardCharsets.UTF_8))

  /** Whole-file export: what ExportController's /api/export/gainstrack served. */
  private def exportFor(text: String): String = {
    val parser = new GainstrackParser
    parser.parseString(text)
    GainstrackGenerator(parser.getCommands).toGainstrack
  }

  "per-command toGainstrack goldens" should "be dumped for the checked-in ledgers" in {
    assume(sys.props.contains("dumpFixtures"), "golden dump — run with -DdumpFixtures=1")
    resources.foreach { name =>
      val blocks = blocksFor(Source.fromResource(s"$name.gainstrack").mkString)
      write(outDir.resolve(s"$name.blocks.json"), blocks)
      info(s"wrote $name (${blocks.size} command blocks)")
    }
  }

  it should "be dumped for the local private ledger" in {
    assume(sys.props.contains("dumpFixtures"), "golden dump — run with -DdumpFixtures=1")
    val sourcePath = Paths.get(sys.props.getOrElse("localGainstrack", "glorat.gainstrack")).toAbsolutePath
    assume(Files.exists(sourcePath), s"no ledger at $sourcePath")

    val name = sourcePath.getFileName.toString.replaceAll("\\.gainstrack$", "")
    val blocks = blocksFor(Source.fromFile(sourcePath.toFile).mkString)
    Files.createDirectories(localDir)
    write(localDir.resolve(s"$name.blocks.json"), blocks)
    info(s"wrote local $name (${blocks.size} command blocks)")
  }

  "whole-file gainstrack export goldens" should "be dumped for the checked-in ledgers" in {
    assume(sys.props.contains("dumpFixtures"), "golden dump — run with -DdumpFixtures=1")
    resources.foreach { name =>
      val text = exportFor(Source.fromResource(s"$name.gainstrack").mkString)
      writeText(outDir.resolve(s"$name.export.gainstrack"), text)
      info(s"wrote $name export (${text.length} chars)")
    }
  }

  it should "be dumped for the local private ledger too" in {
    assume(sys.props.contains("dumpFixtures"), "golden dump — run with -DdumpFixtures=1")
    val sourcePath = Paths.get(sys.props.getOrElse("localGainstrack", "glorat.gainstrack")).toAbsolutePath
    assume(Files.exists(sourcePath), s"no ledger at $sourcePath")

    val name = sourcePath.getFileName.toString.replaceAll("\\.gainstrack$", "")
    val text = exportFor(Source.fromFile(sourcePath.toFile).mkString)
    Files.createDirectories(localDir)
    writeText(localDir.resolve(s"$name.export.gainstrack"), text)
    info(s"wrote local $name export (${text.length} chars)")
  }
}
