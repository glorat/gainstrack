package com.gainstrack.core.test

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Paths}

import com.gainstrack.command.GainstrackParser
import com.gainstrack.core.{GainstrackJsonSerializers, Transaction}
import com.gainstrack.report.{AccountState, BalanceState, CommandAccountExpander, TransactionState}
import org.json4s.Formats
import org.json4s.jackson.Serialization
import org.scalatest.flatspec.AnyFlatSpec

import scala.io.Source

/**
 * Differential oracle for the TS generator's ERROR behaviour (Slice 1). Runs only the slice-1
 * pipeline (accounts + txs, not FX) over each case so the recorded ok/error reflects the same
 * surface the TS generator covers.
 *
 * Run manually: sbt "core/testOnly com.gainstrack.core.test.DumpGeneratorCases"
 */
class DumpGeneratorCases extends AnyFlatSpec {
  private implicit val formats: Formats =
    org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all addKeySerializers GainstrackJsonSerializers.allKeys

  private val fixtures = Paths.get("client/src/lib/__tests__/fixtures")

  private case class Case(id: String, body: String)

  private def readCases(): Seq[Case] = {
    val raw = Source.fromFile(fixtures.resolve("gen_cases.txt").toFile).mkString
    val marker = "(?m)^### id: (.+)$".r
    val parts = marker.split(raw)
    val ids = marker.findAllMatchIn(raw).map(_.group(1).trim).toSeq
    ids.zip(parts.drop(1)).map { case (id, body) => Case(id, body.stripPrefix("\n")) }
  }

  // Replicates GainstrackGenerator's accounts+txs computation (no FX), forcing evaluation.
  private def runSlice1(body: String): Unit = {
    val parser = new GainstrackParser
    parser.parseString(body)
    val cmds = parser.getCommands
    val firstAcctState = cmds.foldLeft(AccountState())((s, e) => s.handle(e))
    val expander = cmds.foldLeft(CommandAccountExpander(firstAcctState))((s, e) => s.handle(e))
    val acctState = firstAcctState.copy(accounts = expander.acctState.accounts)
    val balanceState = expander.cmds.foldLeft(BalanceState(acctState))((s, e) => s.handle(e))
    val txState = expander.cmds.foldLeft(TransactionState(acctState, balanceState, Seq()))((s, e) => s.handle(e))
    val accounts = acctState.withInterpolatedAccounts.accounts.toSeq.map(_.toAccountDTO)
    val txs = txState.cmds.collect { case t: Transaction => t }
    val _ = (accounts.size, txs.map(_.postings.size).sum) // force
  }

  "generator case behaviours" should "be recorded for the differential test" in {
    assume(sys.props.contains("dumpFixtures"), "golden dump — run with -DdumpFixtures=1")
    val results = readCases().map { c =>
      val status = try { runSlice1(c.body); "ok" } catch { case _: Throwable => "error" }
      Map[String, Any]("id" -> c.id, "status" -> status)
    }
    Files.write(fixtures.resolve("gen_cases.expected.json"),
      Serialization.writePretty(results).getBytes(StandardCharsets.UTF_8))
    results.foreach(r => info(s"  ${r("id")} => ${r("status")}"))
  }
}
