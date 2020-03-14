package com.gainstrack.report

import com.gainstrack.core._

class AssetAllocation(positionSet: PositionSet, tagConfig:Seq[Seq[String]], assetState: AssetState) {

//  val values = allocations.map(a => {
//    val allocationAssets = bg.assetState.assetsForTags(a.toSet)
//    val allocationValue = bg.dailyBalances.positionOfAssets(allocationAssets, bg.acctState, bg.priceFXConverter, bg.assetChainMap, queryDate)
//    allocationValue.getBalance(bg.acctState.baseCurrency)
//  })

  private var counter = 1
  private val MORE = "..."

  val initNode = FooNode(counter, 0, 0, positionSet, "networth")
  val aaData :Seq[FooNode] = initNode +: foo(initNode)

  def toDTO(baseCcy:AssetId, date: LocalDate, fxConverter: FXConverter) = {
    Map(
      "ids" -> aaData.map(_.index.toString),
      "parents" -> aaData.map(p => if (p.parent>0) p.parent.toString else ""),
      "values" -> aaData.map(_.position.convertTo(baseCcy, fxConverter, date).getBalance(baseCcy).number.toDouble),
      "labels" -> aaData.map(_.label)
    )
  }

  private def foo(currentNode: FooNode):Seq[FooNode] = {
    if (currentNode.level >= tagConfig.length) {
      Seq()
    }
    else {
      val thisLevelTags: Seq[String] = tagConfig(currentNode.level)
      val thisLevelNodes: Seq[FooNode] = thisLevelTags.flatMap{ tag => {
        val thisAssets = assetState.assetsForTags(Set(tag))
        val pos = currentNode.position.filter(thisAssets.toSeq)
        if (pos.isEmpty) {
          None
        }
        else {
          counter += 1
          val thisNode = FooNode(counter, currentNode.index, currentNode.level+1, pos, tag)
          Some(thisNode)
        }
      }}
      // FIXME: This will overcount if tags overlap!
      val accountedFor = thisLevelNodes.map(_.position).foldLeft(PositionSet())( _ + _)
      val remainder = currentNode.position - accountedFor

      val skipParent = thisLevelNodes.isEmpty

      if (currentNode.label == "property") {
        val xxx = 1
      }

      val ret = if (skipParent) {
        foo(currentNode.copy(level = currentNode.level + 1))
      }
      else {
        counter += 1
        val remainderNode = FooNode(counter, currentNode.index, currentNode.level+1, remainder, MORE)

        val allThisLevelNodes = thisLevelNodes :+ remainderNode

        allThisLevelNodes.flatMap(thisNode => {
          val childNodes = foo(thisNode)
          thisNode +: childNodes
        })
      }



      if (ret.forall(_.label == MORE)) {
        // Only keep the top level
        counter -= ret.size
        Seq()
      }
      else {
        ret
      }
    }
  }
}

case class FooNode(index: Int, parent: Int, level: Int, position: PositionSet, label:String) {

}
