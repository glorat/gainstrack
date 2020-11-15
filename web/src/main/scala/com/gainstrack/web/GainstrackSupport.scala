package com.gainstrack.web

import java.nio.file.{Files, Paths}
import java.time.{Duration, Instant, LocalDate}

import com.gainstrack.command.GainstrackParser
import com.gainstrack.lifecycle.{FileRepository, FirebaseFactory, GainstrackEntity, MyCommittedEvent}
import com.gainstrack.report.GainstrackGenerator
import com.typesafe.config.ConfigFactory
import javax.servlet.http.HttpServletRequest
import net.glorat.cqrs.{CommittedEvent, RepositoryWithEntityStream}
import org.scalatra.auth.Scentry
import org.scalatra.{ContentEncodingSupport, ScalatraBase}
import org.slf4j.LoggerFactory

import scala.concurrent.ExecutionContext

trait GainstrackSupport extends ContentEncodingSupport {
  self: ScalatraBase =>

  // These methods can be found on AuthenticationSupport but we maintain a narrow
  // dependency here in case, for example, it needs mocking out
  protected def isAuthenticated(implicit request: HttpServletRequest): Boolean
  protected def user(implicit request: HttpServletRequest): GUser
  protected def scentry(implicit request: HttpServletRequest): Scentry[GUser]
  protected implicit val ec: ExecutionContext

  private val logger =  LoggerFactory.getLogger(getClass)

  private val UserDataDir = "db/userdata"

  Files.createDirectories(Paths.get(UserDataDir))

  private val mainRepo = if (GainstrackSupport.useFirestore) FirebaseFactory.createRepo else new FileRepository(Paths.get(UserDataDir))
  private val anonRepo = if (GainstrackSupport.useFirestore) FirebaseFactory.createAnonRepo else mainRepo

  private def repo: RepositoryWithEntityStream = {
    if (isAuthenticated) {
      if (user.isAnonymous) anonRepo else mainRepo
    } else {
      anonRepo
    }
  }

  private def bgDefault:GainstrackGenerator = {
    if (isAuthenticated && !user.isAnonymous) {
      // Try to default from anon saved data
      val migrateOpt = migratedAnonData
      if (migrateOpt.isDefined) {
        val ent =  migrateOpt.get
        return GtCache.get(ent.getState.cmds)
      }
    }

    // Use a sensible starting point
    // TODO: Generalise cacheing to work here too
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

  private def migratedAnonData = {
    require(!user.isAnonymous, "can ony migrate to non anonymous")

    val anon = new AnonAuthStrategy(this)
    val anonUserOpt = anon.authenticate()
    anonUserOpt.flatMap(anonUser => {
      val entOpt = anonRepo.getByIdOpt(anonUser.uuid, new GainstrackEntity())
      entOpt.map(ent => {
        val cmds = ent.getState.cmds
        val ret = new GainstrackEntity(user.uuid)
        ret.source(cmds)
        logger.warn(s"Transferring data from anon ${anonUser.uuid} to ${user.uuid}")
        ret
      })
    })
  }

  protected def bgFromFile = {
    try {
      logger.info(s"Loading bgFromFile for ${user.username} - ${user.uuid}")
      val start:Instant = Instant.now

      val id = user.uuid
      val entOpt = repo.getByIdOpt(id, new GainstrackEntity())
      entOpt.map(ent => {
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
        GainstrackGenerator(cmds)
      })
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
      bgDefault
    }
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
    val id = if (isAuthenticated) user.uuid else {
      val newId = java.util.UUID.randomUUID()
      logger.info(s"Generating anonymous session for ${newId}")
      cookies += (AnonAuthStrategy.ANON_KEY -> newId.toString)
      scentry.user = GUser.anonymous(newId.toString)
      scentry.user.uuid
    }

    logger.info(s"Saving updates to ${id}")
    val ent = repo.getByIdOpt(id, new GainstrackEntity()).getOrElse(GainstrackEntity.defaultBase(id))
    ent.source(bg.originalCommands)

    // Perform final validations
    val res = bg.writeBeancountFile(s"/tmp/${id}.beancount", parser.map(_.sourceMap).getOrElse(ent.getState.sourceMap))
    if (res.length == 0) {
      repo.save(ent, ent.getRevision)
    }
    else {
      // TODO: Return structured message properly
      throw new Exception(res.map(_.message).mkString("\n"))
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

    ret +
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

object GainstrackSupport {
  val config = ConfigFactory.load()
  val useFirestore:Boolean = config.getBoolean("gainstrack.useFirestore")
}