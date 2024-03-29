package com.gainstrack.lifecycle

import com.google.auth.oauth2.GoogleCredentials
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.{FirebaseApp, FirebaseOptions}
import net.glorat.ledger.{FirestoreLedger, FirestoreLedgerConfig}
import org.json4s.{DefaultFormats, ShortTypeHints}

import scala.concurrent.ExecutionContext
import org.json4s.Formats

object FirebaseFactory {
  // FIXME: Move to application.conf or equivalent
  val firestoreConfig: FirestoreLedgerConfig = FirestoreLedgerConfig("https://gainstrack.firebaseio.com", "users", "records")
  val anonFirestoreConfig: FirestoreLedgerConfig = firestoreConfig.copy(mainCollectionName = "anons")
  implicit val formats: Formats = DefaultFormats.withHints(ShortTypeHints(List(classOf[GainstrackEntityDelta]))) + InstantSerializer + UUIDSerializer


  val options: FirebaseOptions =
    new FirebaseOptions.Builder()
      .setCredentials(GoogleCredentials.getApplicationDefault())
      .setDatabaseUrl(firestoreConfig.url)
      .build

  FirebaseApp.initializeApp(options)

  def createCustomToken(uid: String): String = {
    import com.google.firebase.auth.FirebaseAuth
    val auth = FirebaseAuth.getInstance(FirebaseApp.getInstance)
    auth.createCustomToken(uid)
  }


  def createRepo(implicit ec: ExecutionContext) = new FirestoreLedger(firestoreConfig)

  def createAnonRepo(implicit ec: ExecutionContext) = new FirestoreLedger(anonFirestoreConfig)

  def firebaseAuth(): FirebaseAuth = {
    FirebaseAuth.getInstance
  }
}
