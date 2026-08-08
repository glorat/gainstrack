package com.gainstrack.core.test

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Paths}
import java.time.Instant

import com.gainstrack.command.GainstrackParser
import com.gainstrack.core.GainstrackJsonSerializers
import com.gainstrack.report.GainstrackGenerator
import org.json4s.Formats
import org.json4s.jackson.Serialization
import org.scalatest.flatspec.AnyFlatSpec

import scala.io.Source

/**
 * Parity oracle for a LOCAL, git-ignored ledger (a real usage profile, far larger than the
 * synthetic resource files). Runs the Scala parser + generator over it and dumps every key of
 * `GainstrackGenerator.allState` — which is precisely what `/api/allState` serializes into the
 * Pinia store and what the UI data-binds against.
 *
 * The TS side replays the same ledger and diffs against these goldens
 * (client/src/lib/__tests__/localGoldens.spec.ts). Output is git-ignored.
 *
 * Run manually (path defaults to glorat.gainstrack at the repo root):
 *   sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpLocalAllState"
 *   sbt -DdumpFixtures=1 -DlocalGainstrack=/path/to/other.gainstrack "core/testOnly ..."
 */
class DumpLocalAllState extends AnyFlatSpec {
  private implicit val formats: Formats =
    org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all addKeySerializers GainstrackJsonSerializers.allKeys

  private val outDir = Paths.get("client/src/lib/__tests__/fixtures/local")

  // Every key of `allState`; the TS ARTIFACTS list must stay in step with this.
  private val fields = Seq(
    "commands", "accounts", "txs", "balances", "priceState",
    "assetState", "fxMapper", "proxyMapper", "ccys", "tradeFx", "baseCcy",
  )

  private def write(name: String, value: AnyRef): Unit =
    Files.write(outDir.resolve(name), Serialization.writePretty(value).getBytes(StandardCharsets.UTF_8))

  "local allState goldens" should "be dumped from the Scala pipeline" in {
    assume(sys.props.contains("dumpFixtures"), "golden dump — run with -DdumpFixtures=1")

    val sourcePath = Paths.get(sys.props.getOrElse("localGainstrack", "glorat.gainstrack")).toAbsolutePath
    assume(Files.exists(sourcePath), s"no ledger at $sourcePath")

    val text = Source.fromFile(sourcePath.toFile).mkString
    val name = sourcePath.getFileName.toString.replaceAll("\\.gainstrack$", "")

    val parser = new GainstrackParser
    parser.parseString(text)
    val commands = parser.getCommands
    val bg = GainstrackGenerator(commands)
    val all = bg.allState

    Files.createDirectories(outDir)
    fields.foreach(f => write(s"$name.$f.json", all(f).asInstanceOf[AnyRef]))

    // Replay input, so the TS test is stable against later edits to the live ledger.
    Files.write(outDir.resolve(s"$name.gainstrack"), text.getBytes(StandardCharsets.UTF_8))

    write(s"$name.meta.json", Map(
      "source" -> sourcePath.toString,
      "provenance" -> "scala",
      "generatedAt" -> Instant.now().toString,
      "gitCommit" -> sys.props.getOrElse("gitCommit", "unknown"),
      "sourceLines" -> text.split("\n").length,
      "commandCount" -> commands.size,
    ))

    info(s"wrote $name: ${commands.size} commands, ${all("accounts").asInstanceOf[Seq[_]].size} accounts")
  }
}
