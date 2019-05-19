package com.gainstrack.command

object Patterns {
  val datePattern = raw"(\d{4}-\d{2}-\d{2})"
  val acctPattern = raw"(\S+)"
  val assetPattern = raw"([A-Z]+)"
  val balanceMatch = raw"(\S+ \S+)"

}
