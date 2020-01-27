package com.gainstrack.core.test

import java.io.BufferedReader
import java.nio.file.{Files, Paths}

import com.gainstrack.core.AccountKey
import com.gainstrack.lifecycle.{GainstrackEntity, GainstrackRepository}
import com.gainstrack.report.GainstrackGenerator
import org.scalatest.{BeforeAndAfterAll, FlatSpec}

import scala.io.Source

class FirstStored extends FlatSpec with BeforeAndAfterAll {

  val id = java.util.UUID.nameUUIDFromBytes("first stored test case".getBytes)
  val id2 = java.util.UUID.nameUUIDFromBytes("by a different route".getBytes)

  val e = new GainstrackEntity(id)

  val repo = new GainstrackRepository(Paths.get("/tmp"))


  override def beforeAll(): Unit = {
    Files.createDirectories(Paths.get("db/quotes"))

    repo.purge(id)
  }

  "GainstrackEntity" should "source" in {
    import scala.io.Source
    e.source(Source.fromResource("src.gainstrack"))
  }

  it should "save to repo" in {

    repo.save(e, 0)
  }

  it should "combine base with anything" in {

    val e2 = new GainstrackEntity(id2)
    val res = AccountKey.getClass.getResourceAsStream("base.gainstrack")

    e2.source(Source.fromInputStream(res))
    assert(e2.getState.cmdStrs.size == 3)
    e2.source(Source.fromResource("src.gainstrack"))

    assertSameEntity(e, e2)

    repo.save(e2, 0)
  }

  it should "load from repo" in {
    val e1 = repo.getById(id, new GainstrackEntity())
    val e2 = repo.getById(id, new GainstrackEntity())

    assertSameEntity(e1, e2)


  }

  def assertSameEntity(e1: GainstrackEntity, e2:GainstrackEntity) = {

    val gone = e1.getState.cmdStrs -- e2.getState.cmdStrs
    assert(gone == Set())

    val extras = e2.getState.cmdStrs -- e1.getState.cmdStrs
    assert(extras == Set())

    assert(e1.getState.cmdStrs == e2.getState.cmdStrs)

  }
}
