package com.gainstrack.core.test

import com.gainstrack.lifecycle.{FirebaseFactory, GainstrackEntityDelta}
import com.google.auth.oauth2.GoogleCredentials
import com.google.firebase.{FirebaseApp, FirebaseOptions}
import net.glorat.ledger.{FirestoreLedger, FirestoreLedgerConfig, InstantSerializer, UUIDSerializer}
import org.json4s.{DefaultFormats, ShortTypeHints}

import scala.concurrent.ExecutionContext

class FirestoreFirstStored extends FirstStored {
  implicit val ec: ExecutionContext = ExecutionContext.global
  override val repo = FirebaseFactory.createRepo
}
