package com.gainstrack.core.test

import java.nio.file.Paths

import com.gainstrack.lifecycle.{FileRepository, GainstrackEntity}
import net.glorat.cqrs.GUID
import org.scalatest.flatspec.AnyFlatSpec
import java.{util => ju}

class NoTsEntity extends AnyFlatSpec {
  val id: ju.UUID = java.util.UUID.fromString("fec320db-f125-35f3-a0d2-e66ca7e4ce95")

  val e = new GainstrackEntity(id)

  val repo: FileRepository = new FileRepository(Paths.get("/tmp")) {
    override protected def readLinesForId(id: GUID): Seq[String] = {
      import scala.io.Source
      Source.fromResource("nots.history").getLines().toSeq
    }
  }

  "Entity with no repoTimestamp in history" should "load" in {
    val x = repo.getByIdOpt(id, new GainstrackEntity())
  }


}
