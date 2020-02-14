package com.gainstrack.core.test

import java.io.BufferedReader
import java.nio.file.{Files, Paths}

import com.gainstrack.command.{CommodityCommand, CommodityOptions}
import com.gainstrack.core._
import com.gainstrack.lifecycle.{GainstrackEntity, GainstrackEntityDelta, GainstrackRepository, MyCommittedEvent}
import com.gainstrack.report.GainstrackGenerator
import org.scalatest.{BeforeAndAfterAll, FlatSpec}

import scala.io.Source

class FirstStored extends FlatSpec with BeforeAndAfterAll {

  val id = java.util.UUID.nameUUIDFromBytes("first stored test case".getBytes)
  val id2 = java.util.UUID.nameUUIDFromBytes("by a different route".getBytes)
  val idbad = java.util.UUID.nameUUIDFromBytes("corrupted file".getBytes)

  val e = new GainstrackEntity(id)

  val repo = new GainstrackRepository(Paths.get("/tmp"))


  override def beforeAll(): Unit = {
    Files.createDirectories(Paths.get("db/quotes"))

    repo.purge(id)
    repo.purge(id2)
    repo.purge(idbad)
  }

  "GainstrackEntity" should "source" in {
    import scala.io.Source
    e.source(Source.fromResource("src.gainstrack"))
  }

  it should "save to repo" in {
    repo.save(e, 0)
  }

  it should "have events" in {
    val cevs = repo.getAllCommits(id)
    assert (cevs.size == 2)
    assert(cevs(0).event.id == Some(id) )
  }

  it should "combine base with anything" in {

    val e2 = GainstrackEntity.defaultBase(id2)
    assert(e2.getState.cmdStrs.size == 5) // Global is empty
    e2.source(Source.fromResource("src.gainstrack"))

    assertSameEntity(e, e2)

    repo.save(e2, 0)
  }

  it should "load from repo" in {
    val e1 = repo.getById(id, new GainstrackEntity())
    val e2 = repo.getById(id2, new GainstrackEntity())

    assertSameEntity(e1, e2)
  }

  it should "have more events than before" in {
    val cevs = repo.getAllCommits(id2)
    assert (cevs.size == 3)
  }

  it should "ignore corrupted entries" in {
    val e = new GainstrackEntity(idbad)
    e.addCommand("2000-01-01 open Assets:Foo GBP")
    repo.save(e, 100) // Wrong expected version!

    val e2 = repo.getById(idbad, new GainstrackEntity())
    assert(e2.getState.cmdStrs.isEmpty)

    val cevs = repo.getAllCommits(idbad)
    assert (cevs.size == 0)
  }

  it should "handle added CommodityCommand" in {
    assert (repo.getAllCommits(id2).size == 3)

    val e2 = repo.getById(id2, new GainstrackEntity())
    val bg = new GainstrackGenerator(e2.getState.cmds)
    val cmd = CommodityCommand(parseDate("1900-01-01"), AssetId("GOOG"), CommodityOptions())
    val bg2 = bg.addAssetCommand(cmd)

    assert(bg2.assetState.allAssets(AssetId("GOOG")).options.ticker == "")

    e2.source(bg2.originalCommands)
    repo.save(e2, e2.getRevision)

    assert (repo.getAllCommits(id2).size == 4)
  }

  it should "handle replaced CommodityCommand" in {
    assert (repo.getAllCommits(id2).size == 4)

    val e2 = repo.getById(id2, new GainstrackEntity())
    val bg = new GainstrackGenerator(e2.getState.cmds)
    val cmd = CommodityCommand(parseDate("1900-01-01"), AssetId("GOOG"), CommodityOptions(ticker = "GOOG.NY"))
    val bg2 = bg.addAssetCommand(cmd)
    e2.source(bg2.originalCommands)

    assert(bg2.assetState.allAssets(AssetId("GOOG")).options.ticker == "GOOG.NY")

    repo.save(e2, e2.getRevision)

    assert (repo.getAllCommits(id2).size == 5)
  }


  def assertSameEntity(e1: GainstrackEntity, e2:GainstrackEntity) = {

//    val gone = e1.getState.cmdStrs -- e2.getState.cmdStrs
//    assert(gone == Set())
//
//    val extras = e2.getState.cmdStrs -- e1.getState.cmdStrs
//    assert(extras == Set())

    assert(e1.getState.cmdStrs == e2.getState.cmdStrs)

  }
}
