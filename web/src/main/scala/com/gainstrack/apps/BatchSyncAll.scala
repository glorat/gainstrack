package com.gainstrack.apps

import com.gainstrack.quotes.av.SyncUp.batchSyncAll

import scala.concurrent.{Await, ExecutionContext}
import scala.concurrent.duration.Duration

object BatchSyncAll {
  def main(args: Array[String]): Unit = {
    implicit val ec: ExecutionContext = ExecutionContext.global
    val fut = batchSyncAll
    Await.result(fut, Duration.Inf)

  }
}
