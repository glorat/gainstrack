package com.gainstrack.core.test

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Paths}

import com.gainstrack.command.GainstrackParser
import com.gainstrack.core.{GainstrackJsonSerializers, Transaction}
import com.gainstrack.report.GainstrackGenerator
import org.json4s.Formats
import org.json4s.jackson.Serialization
import org.scalatest.flatspec.AnyFlatSpec

import scala.io.Source

/**
 * Golden generator for the TS generator port (Slice 1). For each resource file, runs the full
 * Scala generator and writes its `allState` `accounts` and `txs` as JSON (same web formats), so
 * the TS generator can be diffed against them.
 *
 * Run manually: sbt "core/testOnly com.gainstrack.core.test.DumpGeneratorDTOs"
 */
class DumpGeneratorDTOs extends AnyFlatSpec {
  private implicit val formats: Formats =
    org.json4s.DefaultFormats ++ GainstrackJsonSerializers.all addKeySerializers GainstrackJsonSerializers.allKeys

  private val outDir = Paths.get("client/src/lib/__tests__/fixtures")

  private val resources = Fixtures.names

  "generator goldens" should "be generated for each resource" in {
    assume(sys.props.contains("dumpFixtures"), "golden dump — run with -DdumpFixtures=1")
    Files.createDirectories(outDir)
    resources.foreach { name =>
      val text = Source.fromResource(s"$name.gainstrack").mkString
      val parser = new GainstrackParser
      parser.parseString(text)
      val bg = GainstrackGenerator(parser.getCommands)
      val all = bg.allState

      Files.write(outDir.resolve(s"$name.accounts.json"),
        Serialization.writePretty(all("accounts").asInstanceOf[AnyRef]).getBytes(StandardCharsets.UTF_8))
      Files.write(outDir.resolve(s"$name.txs.json"),
        Serialization.writePretty(all("txs").asInstanceOf[AnyRef]).getBytes(StandardCharsets.UTF_8))

      // The FULL transaction, not `toDTO`. `TransactionDTO` drops `description` and `id`, so a
      // golden built from `allState("txs")` cannot see either — which is how four wrong
      // transaction descriptions survived every parity test until the beancount export exposed
      // them. Dump the case class so those fields are compared directly rather than incidentally.
      val fullTxs = bg.txState.cmds.collect { case t: Transaction =>
        Map[String, Any](
          "id" -> t.id,
          "postDate" -> t.postDate.toString,
          "description" -> t.description,
          "postings" -> t.postings,
        )
      }
      Files.write(outDir.resolve(s"$name.txsFull.json"),
        Serialization.writePretty(fullTxs).getBytes(StandardCharsets.UTF_8))
      Files.write(outDir.resolve(s"$name.balances.json"),
        Serialization.writePretty(all("balances").asInstanceOf[AnyRef]).getBytes(StandardCharsets.UTF_8))
      Seq("priceState", "assetState", "fxMapper", "proxyMapper", "ccys", "tradeFx").foreach { field =>
        Files.write(outDir.resolve(s"$name.$field.json"),
          Serialization.writePretty(all(field).asInstanceOf[AnyRef]).getBytes(StandardCharsets.UTF_8))
      }
      info(s"wrote $name")
    }
  }
}
