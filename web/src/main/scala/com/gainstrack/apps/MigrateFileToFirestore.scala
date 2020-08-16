package com.gainstrack.apps

import java.nio.file.{Files, Paths}
import com.gainstrack.lifecycle.{FileRepository, FirebaseFactory, GainstrackEntity}
import org.slf4j.LoggerFactory

import scala.concurrent.ExecutionContext

object MigrateFileToFirestore {
  val logger = LoggerFactory.getLogger(getClass)

  def main(args: Array[String]): Unit = {
    implicit val ec: ExecutionContext = ExecutionContext.global
    val fireRepo = FirebaseFactory.createRepo
    val path = Paths.get("db/userdata")
    val localRepo = new FileRepository(path)

    val paths = Files.walk(path)
    try {
      paths.filter(Files.isRegularFile(_)).forEach(path => {
        val name = path.toFile.getName
        val uuid = java.util.UUID.fromString(name)
        val commits = localRepo.getAllCommits(uuid)
        val newEntity = new GainstrackEntity()
        commits.foreach(ce => {
          newEntity.applyChange(ce.event, isNew = true)
        })
        val toAdd = newEntity.getUncommittedChanges.size
        logger.info(s"${newEntity.id} : ${toAdd}")

        val fire = fireRepo.getAllCommits(uuid)
        if (fire.length == commits.length) {
          logger.debug(s"Already synced")
        } else if (fire.length > 0) {
          logger.warn(s"Ignoring because aleady exists. Purge first?")
        } else {
          logger.info(s"Migrating")
          fireRepo.save(newEntity, 0)
        }
      })
    }
    catch PartialFunction.empty
    finally if (paths != null) paths.close()

  }
}
