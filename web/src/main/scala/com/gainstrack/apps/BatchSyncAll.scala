package com.gainstrack.apps

import com.gainstrack.quotes.av.SyncUp

import scala.concurrent.{Await, ExecutionContext}
import scala.concurrent.duration.Duration

object BatchSyncAll {
  def main(args: Array[String]): Unit = {
    implicit val ec: ExecutionContext = ExecutionContext.global
    val syncUp = new SyncUp()
    val fut = syncUp.batchSyncAll
    Await.result(fut, Duration.Inf)

  }
}
