package com.gainstrack.command

object Patterns {
  val datePattern: String = raw"(\d{4}-\d{2}-\d{2})"
  val acctPattern: String = raw"(\S+)"
  val assetPattern: String = raw"([A-Z][A-Z0-9-]+)"
  val balanceMatch: String = raw"(\S+ \S+)"

}
