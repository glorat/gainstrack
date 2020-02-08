package com.gainstrack.report

import com.gainstrack.command.CommodityCommand
import com.gainstrack.core.AssetId
import net.glorat.cqrs.{AggregateRootState, DomainEvent}

import scala.collection.SetLike


case class AssetState(
                       allAssets: Map[AssetId, CommodityCommand] = Map(),
                       assetToTags: Map[AssetId, Set[String]] = Map(),
                       tagToAssets: Map[String, Set[AssetId]] = Map())
  extends AggregateRootState {

  def toDTO = {
    allAssets.values.map(_.toDTO).toSeq
  }

  /**
   * @return Assets that have all the tags
   */
  def assetsForTags(tags:Set[String]) : Set[AssetId] = {
    tags.foldLeft(assetToTags.keySet)( (assets,tag) => {
      assets.filter(asset => tagToAssets.get(tag).map(_.contains(asset)).getOrElse(false))
    })
  }

  override def handle(e: DomainEvent): AssetState = {
    e match {
      case c: CommodityCommand => handle(c)
      case _ => this
    }
  }

  def handle(e:CommodityCommand): AssetState = {
    require(!assetToTags.contains(e.asset))
    val newTags = assetToTags.updated(e.asset, e.options.tags)

    val t2a = e.options.tags.foldLeft(tagToAssets)((mp, tag) => {
      mp.updated(tag, tagToAssets.get(tag).getOrElse(Set()) + e.asset)
    })

    this.copy(assetToTags = newTags, tagToAssets = t2a, allAssets = allAssets.updated(e.asset, e))
  }
}
