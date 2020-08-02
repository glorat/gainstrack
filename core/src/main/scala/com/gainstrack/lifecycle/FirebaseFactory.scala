package com.gainstrack.web

import com.google.auth.oauth2.GoogleCredentials
import com.google.firebase.{FirebaseApp, FirebaseOptions}
import net.glorat.ledger.FirestoreLedgerConfig

object FirebaseFactory {
  val firestoreConfig = FirestoreLedgerConfig("https://gainstrack-poc.firebaseio.com", "users", "records")

  val options: FirebaseOptions =
    new FirebaseOptions.Builder()
      .setCredentials(GoogleCredentials.getApplicationDefault())
      .setDatabaseUrl(firestoreConfig.url)
      .build

  FirebaseApp.initializeApp(options)

  def createCustomToken(uid: String) = {
    import com.google.firebase.auth.FirebaseAuth
    FirebaseAuth.getInstance.createCustomToken(uid)
  }
}
