package com.gainstrack.core.test

import java.nio.file.Paths

import com.gainstrack.lifecycle.{GainstrackEntity, GainstrackRepository}
import net.glorat.cqrs.GUID
import org.scalatest.FlatSpec

class NoTsEntity extends FlatSpec {
  val id = java.util.UUID.fromString("fec320db-f125-35f3-a0d2-e66ca7e4ce95")

  val e = new GainstrackEntity(id)

  val repo = new GainstrackRepository(Paths.get("/tmp")) {
    override protected def readLinesForId(id: GUID): Seq[String] = {
      import scala.io.Source
      Source.fromResource("nots.history").getLines.toSeq
    }
  }

  "Entity with no repoTimestamp in history" should "load" in {
    val x = repo.getByIdOpt(id, new GainstrackEntity())
  }


}
