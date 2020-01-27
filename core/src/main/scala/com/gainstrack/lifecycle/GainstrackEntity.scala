package com.gainstrack.lifecycle

import com.gainstrack.command.GainstrackParser
import com.gainstrack.core._
import net.glorat.cqrs._

import scala.collection.SortedSet
import scala.io.BufferedSource

class GainstrackEntity extends AggregateRoot {

  override protected var state : AggregateRootState = GainstrackEntityState(id = java.util.UUID.randomUUID(), cmdStrs=Set())
  def getState : GainstrackEntityState = state.asInstanceOf[GainstrackEntityState]

  def id = getState.id

  def this(initId: GUID) = {
    this()
    applyChange(GainstrackEntityDelta(id = Some(initId)))
  }

  def addCommand(cmdStr:String) = {
    val parser = new GainstrackParser
    parser.parseString(cmdStr)
    val cmds = parser.getCommands
    require(cmds -- getState.cmds == cmds, "Command already exists, no duplicates allowed")
    val delta = GainstrackEntityDelta(adds = cmds.map(_.toGainstrack))

    // TODO: Perform validation on new state
    // val newState = state.handle(delta)

    applyChange(delta)
  }

  def source(src:BufferedSource):Unit = {
    val parser = new GainstrackParser
    parser.parseLines(src.getLines())
    source(parser)
  }

  def source(body:String):Unit = {
    val parser = new GainstrackParser
    parser.parseString(body)
    source(parser)
  }

  private def source(parser: GainstrackParser):Unit = {
    val origCmds = getState.cmds
    val cmds = parser.getCommands
    val adds = cmds -- origCmds
    val removes = origCmds -- cmds
    val delta = GainstrackEntityDelta(
      adds = adds.map(_.toGainstrack),
      removes = removes.map(_.toGainstrack))
    applyChange(delta)
  }
}

case class GainstrackEntityState(id: GUID, cmdStrs: Set[Seq[String]]) extends AggregateRootState {
  new GainstrackParser
  def cmds = {
    val parser = new GainstrackParser
    parser.parseLines(cmdStrs.toSeq.flatten)
    parser.getCommands
  }

  private def addCommand(cmd:Seq[String]) : GainstrackEntityState = {
    copy( cmdStrs = (cmdStrs + cmd))
  }

  private def removeCommand(cmd:Seq[String]): GainstrackEntityState = {
    require(cmdStrs.contains(cmd))
    val without = cmdStrs.filterNot(_ == cmd)
    copy (cmdStrs = without)
  }

  override def handle(e: DomainEvent): AggregateRootState = {
    e match {
      case d: GainstrackEntityDelta => handle(d)
    }
  }

  def handle(e: GainstrackEntityDelta): GainstrackEntityState = {

    val removed = e.removes.foldLeft(this)(_.removeCommand(_))
    val added = e.adds.foldLeft(removed)( _.addCommand(_))
    // Apply if exists - should only be the first event
    e.id.map(id => added.copy(id = id)).getOrElse(added)
  }
}

case class GainstrackEntityDelta(
                                id: Option[GUID] = None,
                                adds: Set[Seq[String]] = Set(),
                                removes: Set[Seq[String]] = Set()
                                ) extends DomainEvent