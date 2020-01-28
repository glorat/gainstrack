package com.gainstrack.web

import java.nio.file.{Files, Paths}
import java.time.{Duration, Instant, LocalDate}

import com.gainstrack.command.GainstrackParser
import com.gainstrack.lifecycle.GainstrackRepository
import com.gainstrack.report.GainstrackGenerator
import javax.servlet.http.HttpServletRequest
import org.scalatra.ScalatraBase
import org.slf4j.LoggerFactory

trait GainstrackSupport {
  self: ScalatraBase =>

  // These methods can be found on AuthenticationSupport but we maintain a narrow
  // dependency here in case, for example, it needs mocking out
  protected def isAuthenticated(implicit request: HttpServletRequest): Boolean
  protected def user(implicit request: HttpServletRequest): GUser

  private val logger =  LoggerFactory.getLogger(getClass)

  private val UserDataDir = "db/userdata"

  private val repo = new GainstrackRepository(Paths.get(UserDataDir))

  private def bgDefault = {
    var start:Instant = Instant.now

    val parser = new GainstrackParser
    val realFile = "real"
    parser.parseFile(s"/Users/kevin/dev/gainstrack/data/${realFile}.gainstrack")
    val orderedCmds = parser.getCommands
    val ret = GainstrackGenerator(orderedCmds)

    val endTime = Instant.now
    val duration = Duration.between(start, endTime)
    logger.info(s"bgDefault processed in ${duration.toMillis}ms")

    ret
  }

  private def userFile:String = {
    s"$UserDataDir/${user.id}.txt"
  }

  protected def bgFromFile = {
    try {
      val parser = new GainstrackParser
      parser.parseFile(userFile)
      logger.info(s"Loading bgFromFile $userFile")
      Some(GainstrackGenerator(parser.getCommands))
    }
    catch {
      case e:Exception => {
        logger.error(s"Failed to bgFromFile $userFile")
        logger.error(e.toString)
        None
      }
    }

  }

  protected def dateOverride:Option[LocalDate] = {
    session.get("dateOverride").map(_.asInstanceOf[LocalDate])
  }

  def getGainstrack = {
    val gt = if (isAuthenticated) {
      session.get("gainstrack").map(_.asInstanceOf[GainstrackGenerator])
        .orElse(bgFromFile)
        .getOrElse(bgDefault)
    }
    else {
      session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    }
    // Use session from now on
    session("gainstrack") = gt
    gt
  }

  def saveGainstrack(bg:GainstrackGenerator) = {
    if (isAuthenticated) {
      val file = s"$UserDataDir/${user.id}.txt"
      bg.writeGainstrackFile(file)
      logger.info("")

    }
    else {
      logger.error("Attempt to saveGainstrack while no logged in ignored")
    }

  }

  def getSummary: StateSummaryDTO = {
    val bg = getGainstrack

    val accts = bg.acctState.accounts.map(_.accountId)
    val ccys = bg.priceState.ccys
    val conversionStrategy = session.get("conversion").map(_.toString).getOrElse("parent")
    val authnSummary = if (isAuthenticated) {
      AuthnSummary(Some(user.username))
    }
    else {
      AuthnSummary()
    }
    StateSummaryDTO(accts.toSeq.sorted, ccys.toSeq.sorted, conversionStrategy,
      bg.latestDate, dateOverride, authnSummary)
  }
}
