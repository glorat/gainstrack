package com.gainstrack.core.test

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Paths}

import com.gainstrack.command.GainstrackParser
import com.gainstrack.core.{BeancountLine, Transaction}
import com.gainstrack.report.GainstrackGenerator
import org.json4s.Formats
import org.json4s.jackson.Serialization
import org.scalatest.flatspec.AnyFlatSpec

import scala.io.Source

/**
 * Golden oracle for the TypeScript beancount export (`toBeancountFile`).
 *
 * Dumped as three sections rather than one blob, because they need different strictness:
 *  - headers and the COMMAND stream are ordered `Seq`s and must match exactly;
 *  - the ACCOUNT block comes from `acctState.accounts`, a `Set`, so Scala's order is JVM hash
 *    order. Comparing it as an ordered sequence would assert something neither meaningful nor
 *    reproducible, so the TS side sorts and the spec compares as a set.
 *
 * Run manually:
 *   sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpToBeancount"
 */
class DumpToBeancount extends AnyFlatSpec {
  private implicit val formats: Formats = org.json4s.DefaultFormats

  private val outDir = Paths.get("client/src/lib/__tests__/fixtures")
  private val localDir = outDir.resolve("local")

  private val resources = Seq("basic", "unit", "src", "div", "balbug", "james", "noequity", "multiadj")

  private case class Sections(headers: Seq[String], accounts: Seq[String], commands: Seq[String])

  private def sectionsFor(text: String): Sections = {
    val parser = new GainstrackParser
    parser.parseString(text)
    val bg = GainstrackGenerator(parser.getCommands)

    // Mirrors GainstrackGenerator.toBeancount, kept split so each part can be compared apart.
    val headers = Seq(
      "option \"title\" \"Gainstrack\"",
      s"""option "operating_currency" "${bg.globalCommand.operatingCurrency.symbol}"""",
      "plugin \"beancount.plugins.implicit_prices\"",
    )
    val accounts: Seq[String] = bg.acctState.accounts.flatMap(_.toBeancount).toSeq.map(_.value)
    val commands: Seq[String] = bg.txState.cmds.flatMap(_.toBeancount).map(_.value)
    Sections(headers, accounts, commands)
  }

  private def write(path: java.nio.file.Path, s: Sections): Unit =
    Files.write(path, Serialization.writePretty(s).getBytes(StandardCharsets.UTF_8))

  "beancount goldens" should "be dumped for the checked-in ledgers" in {
    assume(sys.props.contains("dumpFixtures"), "golden dump — run with -DdumpFixtures=1")
    resources.foreach { name =>
      val s = sectionsFor(Source.fromResource(s"$name.gainstrack").mkString)
      write(outDir.resolve(s"$name.beancount.json"), s)
      info(s"wrote $name (${s.accounts.size} account lines, ${s.commands.size} command lines)")
    }
  }

  it should "be dumped for the local private ledger" in {
    assume(sys.props.contains("dumpFixtures"), "golden dump — run with -DdumpFixtures=1")
    val sourcePath = Paths.get(sys.props.getOrElse("localGainstrack", "glorat.gainstrack")).toAbsolutePath
    assume(Files.exists(sourcePath), s"no ledger at $sourcePath")

    val name = sourcePath.getFileName.toString.replaceAll("\\.gainstrack$", "")
    val s = sectionsFor(Source.fromFile(sourcePath.toFile).mkString)
    Files.createDirectories(localDir)
    write(localDir.resolve(s"$name.beancount.json"), s)
    info(s"wrote local $name (${s.accounts.size} account lines, ${s.commands.size} command lines)")
  }
}
