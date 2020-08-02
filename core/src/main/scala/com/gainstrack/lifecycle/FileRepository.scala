package com.gainstrack.lifecycle

import java.io.{FileOutputStream, IOException, PrintWriter}

import net.glorat.cqrs._

import scala.concurrent.Future
import scala.reflect.ClassTag
import java.nio.file.{Files, OpenOption, Path, Paths, StandardOpenOption}
import java.time.Instant
import java.util.UUID

import org.json4s._
import org.json4s.jackson.Serialization.{read, write}
import org.slf4j.LoggerFactory

class FileRepository(basePath:Path) extends RepositoryWithEntityStream {
  val logger =  LoggerFactory.getLogger(getClass)

  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats + UUIDSerializer + InstantSerializer

  require(Files.isDirectory(basePath), s"$basePath must exist as directory")

  protected def filenameForId(id: GUID)  = {
    basePath.resolve(id.toString)
  }

  protected def readLinesForId(id: GUID):Seq[String] = {
    import scala.collection.JavaConverters._
    val filename = filenameForId(id)
    val lines = Files.readAllLines(filename).asScala
    lines
  }

  override def save(aggregate: AggregateRoot, expectedVersion: Int): Future[Unit] = {
    val evs = aggregate.getUncommittedChanges
    var i = expectedVersion
    val cevs = evs.map(ev => {
      i += 1
      MyCommittedEvent(ev.asInstanceOf[GainstrackEntityDelta], aggregate.id, i, Instant.now())
    })

    val path = filenameForId(aggregate.id)

    using(new PrintWriter(Files.newOutputStream(path, StandardOpenOption.CREATE, StandardOpenOption.APPEND))) { w =>
      cevs.foreach(cev => {
        // Cannot write directly to stream because the write method might close it
        val str = write(cev)
        w.println(str)
      })
    }

    Future.successful()
  }

  def getByIdOpt[T <: AggregateRoot](id: GUID, tmpl: T)(implicit evidence$1: ClassTag[T]): Option[T] = {
    try {
      val lines = readLinesForId(id)
      var revision = 1
      val cevs = lines.map(line => {
        val cev = read[MyCommittedEvent](line)
        if (id == cev.streamId) {
          if (revision == cev.streamRevision) {
            tmpl.loadFromHistory(Seq(cev.event), cev.streamRevision)
            revision += 1
          }
          else {
            logger.error(s"${id} has invalid CE at revision ${cev.streamRevision} is ignored")
          }
        }
      })
      Some(tmpl)
    }
    catch {
      case e: IOException => {
        logger.warn(s"getById(${id}) failed because ${e.getMessage}")
        None
      }
    }
  }

  def getAllCommits(id: GUID) : Seq[CommittedEvent] = {
    val lines = readLinesForId(id)
    var revision = 1
    val cevs = lines.toSeq.map(line => {
      val mcev = read[MyCommittedEvent](line)
      CommittedEvent(event = mcev.event, streamId = mcev.streamId, streamRevision = mcev.streamRevision)
    }).filter(cev=> {
      if (id == cev.streamId) {
        if (revision == cev.streamRevision) {
          revision += 1
          true
        }
        else {
          logger.error(s"${id} has invalid CE at revision ${cev.streamRevision} is ignored")
          false
        }
      }
      else {
        false
      }
    })
    cevs
  }

  // Use for admin only
  override def purge(id: GUID) = {
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

object InstantSerializer extends CustomSerializer[Instant](format => ({
  case JLong(dbl) => Instant.ofEpochMilli(dbl)
  case JInt(num) => Instant.ofEpochMilli(num.toLong)
}, {
  case value: Instant => {
    JInt(value.toEpochMilli)
  }
}))

// Dodge the whole JSON polymorphism problem by using a specific CE class
// Normal practice is to wrap event in an envelope to have, for example
// type discriminator and timestamps
case class MyCommittedEvent(event:GainstrackEntityDelta, streamId: GUID, streamRevision:Int, repoTimestamp: Instant = Instant.parse("1900-01-01T00:00:00Z"))