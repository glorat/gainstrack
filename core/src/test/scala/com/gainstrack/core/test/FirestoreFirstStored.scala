package com.gainstrack.core.test

import com.gainstrack.lifecycle.GainstrackEntityDelta
import net.glorat.ledger.{FirestoreLedger, FirestoreLedgerConfig, InstantSerializer, UUIDSerializer}
import org.json4s.{DefaultFormats, ShortTypeHints}

import scala.concurrent.ExecutionContext

class FirestoreFirstStored extends FirstStored {
  // TODO: Does test environment offer better than global
  implicit val ec: ExecutionContext = ExecutionContext.global
  val firestoreConfig = FirestoreLedgerConfig("https://gainstrack-poc.firebaseio.com", "users", "records")
  implicit val formats = DefaultFormats.withHints(ShortTypeHints(List(classOf[GainstrackEntityDelta]))) + InstantSerializer + UUIDSerializer

  override val repo = new FirestoreLedger(firestoreConfig)
}
