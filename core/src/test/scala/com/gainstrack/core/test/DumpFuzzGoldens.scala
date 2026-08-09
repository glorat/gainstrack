package com.gainstrack.core.test

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Path, Paths}

import com.gainstrack.command.GainstrackParser
import com.gainstrack.core.{GainstrackJsonSerializers, Transaction}
import com.gainstrack.report.GainstrackGenerator
import org.json4s.Formats
import org.json4s.jackson.Serialization
import org.scalatest.flatspec.AnyFlatSpec

import scala.io.Source
import scala.jdk.CollectionConverters._

/**
 * Batch oracle for the generated differential corpus.
 *
 * The per-fixture dump suites take one hand-written ledger each; this one sweeps a whole
 * directory, so the corpus can grow to hundreds of ledgers for the cost of a single sbt run.
 * That is the point — the checked-in fixtures cover the language as someone thought to write it,
 * and the generated corpus covers combinations nobody thought of.
 *
 * For each ledger it records the same three-way behaviour the parser corpus uses (ok / error /
 * crash), and for the ledgers that survive, every artifact the TS port is expected to reproduce:
 * command DTOs, full transactions (description included — the DTO drops it), the beancount
 * sections and the whole-file gainstrack export.
 *
 * Run: sbt -DdumpFixtures=1 "core/testOnly com.gainstrack.core.test.DumpFuzzGoldens"
 */
class DumpFuzzGoldens extends AnyFlatSpec {
  private implicit val formats: Formats =
    org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all addKeySerializers GainstrackJsonSerializers.allKeys

  private val fuzzDir = Paths.get("client/src/lib/__tests__/fixtures/fuzz")

  private def ledgers: Seq[Path] =
    Files.list(fuzzDir).iterator().asScala.toSeq
      .filter(_.getFileName.toString.endsWith(".gainstrack"))
      .sortBy(_.getFileName.toString)

  private def artifactsFor(text: String): Map[String, Any] = {
    val parser = new GainstrackParser
    // Parse and generate are recorded as separate stages. They fail for genuinely different
    // reasons — bad syntax versus a ledger that is well-formed but does not make sense — and
    // collapsing them would let a TS port that rejects at the wrong stage still look correct.
    val parsed =
      try { parser.parseString(text); Right(parser.getCommands) }
      catch { case _: Throwable => Left(if (parser.parserErrors.nonEmpty) "error" else "crash") }

    parsed match {
      case Left(status) => Map("parse" -> status)
      case Right(cmds) =>
        val base = Map[String, Any]("parse" -> "ok", "commands" -> cmds.map(_.toDTO))
        try {
          val bg = GainstrackGenerator(cmds)
          val all = bg.allState
          val fullTxs = bg.txState.cmds.collect { case t: Transaction =>
            Map[String, Any]("id" -> t.id, "postDate" -> t.postDate.toString,
              "description" -> t.description, "postings" -> t.postings)
          }
          base ++ Map[String, Any](
            "generate" -> "ok",
            "accounts" -> all("accounts"),
            "txs" -> all("txs"),
            "balances" -> all("balances"),
            "priceState" -> all("priceState"),
            "assetState" -> all("assetState"),
            "fxMapper" -> all("fxMapper"),
            "proxyMapper" -> all("proxyMapper"),
            "ccys" -> all("ccys"),
            "baseCcy" -> all("baseCcy"),
            "tradeFx" -> all("tradeFx"),
            "txsFull" -> fullTxs,
            "beancount" -> Map(
              "accounts" -> bg.acctState.accounts.flatMap(_.toBeancount).toSeq.map(_.value),
              "commands" -> bg.txState.cmds.flatMap(_.toBeancount).map(_.value),
            ),
            "export" -> bg.toGainstrack,
          )
        } catch {
          // The message is recorded but not asserted on: the two implementations word their
          // failures differently and always will. It is here so that a status divergence can be
          // diagnosed from the golden instead of by re-running sbt against a hunch.
          case e: Throwable =>
            base ++ Map[String, Any]("generate" -> "error", "generateError" -> String.valueOf(e.getMessage))
        }
    }
  }

  "fuzz corpus goldens" should "be dumped for every generated ledger" in {
    assume(sys.props.contains("dumpFixtures"), "golden dump — run with -DdumpFixtures=1")
    assume(Files.isDirectory(fuzzDir), s"no corpus at $fuzzDir — run `pnpm run fixtures:fuzz` first")

    val results = ledgers.map { p =>
      val name = p.getFileName.toString.replaceAll("\\.gainstrack$", "")
      val text = Source.fromFile(p.toFile).mkString
      Map[String, Any]("id" -> name) ++ artifactsFor(text)
    }

    // Gzipped: the uncompressed goldens are ~7.5MB, which is more than a repo should carry for
    // a test fixture, and they compress by roughly 15x because the JSON is highly repetitive.
    // Both sides have gzip in the standard library, so this costs nothing but a wrapper.
    val out = new java.io.ByteArrayOutputStream()
    val gz = new java.util.zip.GZIPOutputStream(out)
    gz.write(Serialization.write(results).getBytes(StandardCharsets.UTF_8))
    gz.close()
    Files.write(fuzzDir.resolve("fuzz.expected.json.gz"), out.toByteArray)

    val parseOk = results.count(_.getOrElse("parse", "") == "ok")
    val genOk = results.count(_.getOrElse("generate", "") == "ok")
    info(s"dumped ${results.size} ledgers: $parseOk parsed, $genOk generated")
  }
}
