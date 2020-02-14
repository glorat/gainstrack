package com.gainstrack.report

import com.gainstrack.command.{AccountCreation, CommandNeedsAccounts, CommodityCommand, SecurityPurchase, UnitTrustBalance}
import com.gainstrack.core.AssetId
import net.glorat.cqrs.{AggregateRootState, DomainEvent}

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
      case c: AccountCreation => handle(c)
      case c: SecurityPurchase => handle(c)
      case c: UnitTrustBalance => handle(c)
      case _ => this
    }
  }

  def handle(e:AccountCreation): AssetState = {
    handleDefault(e.key.assetId)
  }

  def handle(e:SecurityPurchase): AssetState = {
    handleDefault(e.security.ccy)
  }

  def handle(e:UnitTrustBalance): AssetState = {
    handleDefault(e.security.ccy)
  }

  private def handleDefault(assetId: AssetId): AssetState = {
    if (allAssets.contains(assetId)) {
      this // Already have something, do not overwrite
    }
    else {
      // Put in a placeholder
      this.copy(allAssets = allAssets.updated(assetId, CommodityCommand(assetId)))
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
