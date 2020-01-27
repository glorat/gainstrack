package com.gainstrack.lifecycle

import java.io.{FileOutputStream, PrintWriter}

import net.glorat.cqrs._

import scala.concurrent.Future
import scala.reflect.ClassTag
import java.nio.file.{Files, OpenOption, Path, Paths, StandardOpenOption}
import java.util.UUID

import org.json4s._
import org.json4s.jackson.Serialization.{read, write}

class GainstrackRepository(basePath:Path) extends Repository {
  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats + UUIDSerializer

  require(Files.isDirectory(basePath), s"$basePath must exist as directory")

  override def save(aggregate: AggregateRoot, expectedVersion: Int): Future[Unit] = {
    val evs = aggregate.getUncommittedChanges
    var i = expectedVersion
    val cevs = evs.map(ev => {
      i += 1
      MyCommittedEvent(ev.asInstanceOf[GainstrackEntityDelta], aggregate.id, i)
    })

    val path = basePath.resolve(aggregate.id.toString)

    using(new PrintWriter(Files.newOutputStream(path, StandardOpenOption.CREATE, StandardOpenOption.APPEND))) { w =>
      cevs.foreach(cev => {
        // Cannot write directly to stream because the write method might close it
        val str = write(cev)
        w.println(str)
      })
    }

    Future.successful()
  }

  override def getById[T <: AggregateRoot](id: GUID, tmpl: T)(implicit evidence$1: ClassTag[T]): T = {
    import scala.collection.JavaConverters._

    val filename = basePath.resolve(id.toString)
    val lines = Files.readAllLines(filename).asScala
    val cevs = lines.map(line => {
      val cev = read[MyCommittedEvent](line)
      if (id == cev.streamId) {
        tmpl.loadFromHistory(Seq(cev.event), cev.streamRevision)
      }
    })
    tmpl
  }

  // Use for admin only
  def purge(id: GUID) = {
    val filename = basePath.resolve(id.toString)
    Files.deleteIfExists(filename)
  }

  // Retire this when we get to scala 2.13
  def using[T <: {def close()}]
  (resource: T)
  (block: T => Unit) {
    try {
      block(resource)
    } finally {
      if (resource != null) resource.close()
    }
  }
}

object UUIDSerializer extends CustomSerializer[UUID](format => ({
  case JString(str) => UUID.fromString(str)
}, {
  case value: UUID  => {
    JString(value.toString)
  }
}
))


// Dodge the whole JSON polymorphism problem by using a specific CE class
case class MyCommittedEvent(event:GainstrackEntityDelta, streamId: GUID, streamRevision:Int)