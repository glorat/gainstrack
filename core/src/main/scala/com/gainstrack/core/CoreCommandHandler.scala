package com.gainstrack.core

import com.typesafe.scalalogging.LazyLogging
import net.glorat.cqrs.{Command, CommandHandler, Repository}

import scala.concurrent.Future

class CoreCommandHandler(protected val repository: Repository) extends CommandHandler with LazyLogging {
  override def receive: PartialFunction[Command, Future[Unit]] = {
    case cmd: Command => {
      // In some future extension, the command may have candidate name, company, experience etc.
      // to be added to some data store
      val t = repository.getById(???, ???)

      ///t.handleCommand(cmd)
      repository.save(t, 0)
    }

  }
}
