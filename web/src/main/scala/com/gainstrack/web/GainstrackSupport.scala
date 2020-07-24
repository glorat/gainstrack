package com.gainstrack.web

import java.nio.file.{Files, Paths}
import java.time.{Duration, Instant, LocalDate}

import com.gainstrack.command.GainstrackParser
import com.gainstrack.lifecycle.{FileRepository, GainstrackEntity, MyCommittedEvent}
import com.gainstrack.report.GainstrackGenerator
import javax.servlet.http.HttpServletRequest
import net.glorat.cqrs.CommittedEvent
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

  Files.createDirectories(Paths.get(UserDataDir))

  private val repo = new FileRepository(Paths.get(UserDataDir))

  private def bgDefault = {
    val start:Instant = Instant.now

    val ent = GainstrackEntity.defaultBase(java.util.UUID.randomUUID())
    val orderedCmds = ent.getState.cmds
    val ret = GainstrackGenerator(orderedCmds)
    val endTime = Instant.now
    val duration = Duration.between(start, endTime)
    logger.info(s"bgDefault generation in ${ret.generationDuration.toMillis}ms")
    logger.info(s"bgDefault total in ${duration.toMillis}ms")


    ret
  }

  protected def bgFromFile = {
    try {
      logger.info(s"Loading bgFromFile for ${user.username} - ${user.uuid}")
      val start:Instant = Instant.now

      val id = user.uuid
      val ent = repo.getByIdOpt(id, new GainstrackEntity()).getOrElse(GainstrackEntity.defaultBase(id))
      val cmds = ent.getState.cmds
      // val ret = GainstrackGenerator(cmds)
      val midTime = Instant.now
      val ret = GtCache.get(cmds)
      val endTime = Instant.now
      val fhDuration = Duration.between(start, midTime)
      val shDuration = Duration.between(midTime, endTime)
      val duration = Duration.between(start, endTime)
      logger.info(s"bgFromFile original generation in ${ret.generationDuration.toMillis}ms")
      logger.info(s"bgFromFile ${fhDuration.toMillis}+${shDuration.toMillis} = total in ${duration.toMillis}ms")
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
      bgFromFile.getOrElse(bgDefault)
//      session.get("gainstrack").map(_.asInstanceOf[GainstrackGenerator])
//        .orElse(bgFromFile)
//        .getOrElse(bgDefault)
    }
    else {
      session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    }
    // Use session from now on
    session("gainstrack") = gt
    gt
  }

  def getHistory:Seq[CommittedEvent] = {
    if (isAuthenticated) {
      // Reverse so we have most recent first
      repo.getAllCommits(user.uuid).reverse
    }
    else {
      Seq()
    }
  }

  def saveGainstrack(bg:GainstrackGenerator, parser:Option[GainstrackParser] = None) = {
    if (isAuthenticated) {
      val id = user.uuid
      logger.info(s"Saving updates to ${user.username} ${id}")
      val ent = repo.getByIdOpt(id, new GainstrackEntity()).getOrElse(GainstrackEntity.defaultBase(id))
      ent.source(bg.originalCommands)

      // Perform final validations
      val res = bg.writeBeancountFile(s"/tmp/${id}.beancount", parser.map(_.sourceMap).getOrElse(ent.getState.sourceMap))
      if (res.length == 0) {
        repo.save(ent, ent.getRevision)
        session("gainstrack") = bg
      }
      else {
        // TODO: Return structured message properly
        throw new Exception(res.map(_.message).mkString("\n"))
      }
    }
    else {
      // Perform final validations
      val res = bg.writeBeancountFile(s"/tmp/anonymous.beancount", parser.map(_.sourceMap).getOrElse(_ => 0))
      if (res.length == 0) {
        session("gainstrack") = bg
      }
      else {
        throw new Exception(res.map(_.message).mkString("\n"))
      }
      logger.info("Anonymous saveGainstrack - in-memory only")
    }

  }

  def getSummary: StateSummaryDTO = {
    val bg = getGainstrack

    val accts = bg.acctState.accounts.map(_.accountId)
    val ccys = bg.priceState.ccys
    val conversionStrategy = session.get("conversion").map(_.toString).getOrElse("parent")
    val authnSummary = getAuthentication
    StateSummaryDTO(accts.toSeq.sorted, bg.acctState.accounts.toSeq.map(_.toAccountDTO), bg.acctState.baseCurrency, ccys.toSeq.sorted, conversionStrategy,
      bg.latestDate, dateOverride, authnSummary, bg.originalCommands.map(_.toDTO))
  }

  def getAllState: Map[String, Any] = {
    val bg = getGainstrack
    val ret = bg.allState

    val accts = bg.acctState.withInterpolatedAccounts.accounts.map(_.accountId)
    val ccys = bg.priceState.ccys
    val conversionStrategy = session.get("conversion").map(_.toString).getOrElse("parent")
    val authnSummary = getAuthentication

    ret + ("accountIds" -> accts) +
      ("accounts" -> bg.acctState.withInterpolatedAccounts.accounts.toSeq.map(_.toAccountDTO)) +
      ("baseCcy" -> bg.acctState.baseCurrency) +
      ("ccys" -> ccys.toSeq.sorted) +
      ("conversion" -> conversionStrategy) +
      ("latestDate" -> bg.latestDate) +
      ("dateOverride" -> dateOverride) +
      ("authentication" -> authnSummary)
  }

  def getAuthentication: AuthnSummary = {
    if (isAuthenticated) {
      AuthnSummary(Some(user.username))
    }
    else {
      AuthnSummary()
    }
  }
}
