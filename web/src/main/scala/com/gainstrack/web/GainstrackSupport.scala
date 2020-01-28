package com.gainstrack.web

import java.nio.file.{Files, Paths}
import java.time.{Duration, Instant, LocalDate}

import com.gainstrack.command.GainstrackParser
import com.gainstrack.lifecycle.{GainstrackEntity, GainstrackRepository}
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
    val start:Instant = Instant.now

    val ent = GainstrackEntity.defaultBase(java.util.UUID.randomUUID())
    val orderedCmds = ent.getState.cmds
    val ret = GainstrackGenerator(orderedCmds)
    val endTime = Instant.now
    val duration = Duration.between(start, endTime)
    logger.info(s"bgDefault processed in ${duration.toMillis}ms")

    ret
  }

  protected def bgFromFile = {
    try {
      logger.info(s"Loading bgFromFile for ${user.username} - ${user.uuid}")

      val id = user.uuid
      val ent = repo.getByIdOpt(id, new GainstrackEntity()).getOrElse(GainstrackEntity.defaultBase(id))
      val cmds = ent.getState.cmds
      Some(GainstrackGenerator(cmds))
    }
    catch {
      case e:Exception => {
        logger.error(s"Failed to bgFromFile ${user.username} - ${user.uuid}")
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
      val id = user.uuid
      val ent = repo.getByIdOpt(id, new GainstrackEntity()).getOrElse(GainstrackEntity.defaultBase(id))

      ent.source(bg.originalCommands)
      repo.save(ent, ent.getRevision)
//      val file = s"$UserDataDir/${user.id}.txt"
//      bg.writeGainstrackFile(file)

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
