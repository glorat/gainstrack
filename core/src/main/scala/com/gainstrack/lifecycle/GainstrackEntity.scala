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
    val nodupes = cmds.forall(!getState.cmds.contains(_))
    require(nodupes, "Command already exists, no duplicates allowed")
    val delta = GainstrackEntityDelta(adds = Some(cmds.map(_.toGainstrack)))

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
    val cmds = parser.getCommands
    source(cmds)
  }

  def source(cmds: Seq[AccountCommand]): Unit = {
    val origCmds = getState.cmds
    val adds = cmds.filter(!origCmds.contains(_)).map(_.toGainstrack)
    val removes = origCmds.filter(!cmds.contains(_)).map(_.toGainstrack)
    val delta:GainstrackEntityDelta = GainstrackEntityDelta()
      .withAdds(adds)
      .withRemoves(removes)
    if (!delta.isEmpty) {
      applyChange(delta)
    }
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
    // Tricky but concise functional logic
    val removed = e.removes.map(_.foldLeft(this)(_.removeCommand(_))).getOrElse(this)
    val added = e.adds.map(_.foldLeft(removed)( _.addCommand(_))).getOrElse(removed)
    // Apply if exists - should only be the first event
    e.id.map(id => added.copy(id = id)).getOrElse(added)
  }
}

object GainstrackEntity {
  def defaultBase(id: GUID): GainstrackEntity = {
    import scala.io.Source

    val res = AccountKey.getClass.getResourceAsStream("base.gainstrack")
    val ret = new GainstrackEntity(id)
    ret.source(Source.fromInputStream(res))
    ret
  }
}

case class GainstrackEntityDelta(
                                id: Option[GUID] = None,
                                adds: Option[Seq[Seq[String]]] = None,
                                removes: Option[Seq[Seq[String]]] = None
                                ) extends DomainEvent {
  def isEmpty = this == GainstrackEntityDelta()

  def withAdds(as: Seq[Seq[String]]) : GainstrackEntityDelta = {
    if (as.length>0) {
      copy(adds = Some(as))
    }
    else {
      copy(adds = None)
    }
  }

  def withRemoves(as: Seq[Seq[String]]) : GainstrackEntityDelta = {
    if (as.length>0) {
      copy(removes = Some(as))
    }
    else {
      copy(removes = None)
    }
  }
}