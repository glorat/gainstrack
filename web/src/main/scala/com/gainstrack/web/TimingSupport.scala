package com.gainstrack.web

import java.time.{Duration, Instant}

import org.scalatra.ScalatraBase
import org.slf4j.LoggerFactory

trait TimingSupport {
  self: ScalatraBase =>

  private val logger =  LoggerFactory.getLogger(getClass)
  var lastStart:Instant = Instant.now

  before() {
    logger.info(s"${request.getServerName}:${request.getServerPort}${request.getPathInfo}")
    lastStart = Instant.now
  }

  after() {
    val endTime = Instant.now
    val duration = Duration.between(lastStart, endTime)
    logger.info(s"${request.getPathInfo} processed in ${duration.toMillis}ms")
  }
}
