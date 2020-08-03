package com.gainstrack.core.test

import java.nio.file.Paths

import com.gainstrack.lifecycle.{FileRepository, FirebaseFactory, GainstrackEntity}
import net.glorat.ledger.InMemoryLedger

import scala.concurrent.ExecutionContext

class FirestoreFirstStored extends FirstStored {
  implicit val ec: ExecutionContext = ExecutionContext.global
  private def firebaseAvailable = System.getenv("GOOGLE_APPLICATION_CREDENTIALS")!=null
  override val repo = if (firebaseAvailable) FirebaseFactory.createRepo else {
    logger.error("Firebase not configured so falling back to file repo")
    new FileRepository(Paths.get("/tmp"))
  }
}
