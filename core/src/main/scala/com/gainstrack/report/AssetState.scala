package com.gainstrack.report

import com.gainstrack.command.CommodityCommand
import com.gainstrack.core.AssetId
import net.glorat.cqrs.{AggregateRootState, DomainEvent}


case class AssetState(
                       tags: Map[AssetId, Set[String]] = Map(),
                       tagToAssets: Map[String, Set[AssetId]] = Map())
  extends AggregateRootState {
  override def handle(e: DomainEvent): AssetState = {
    e match {
      case c: CommodityCommand => handle(c)
      case _ => this
    }
  }

  def handle(e:CommodityCommand): AssetState = {
    require(!tags.contains(e.asset))
    val newTags = tags.updated(e.asset, e.options.tags)

    val t2a = e.options.tags.foldLeft(tagToAssets)((mp, tag) => {
      mp.updated(tag, tagToAssets.get(tag).getOrElse(Set()) + e.asset)
    })

    this.copy(tags = newTags, tagToAssets = t2a)
  }
}
