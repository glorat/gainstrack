package com.gainstrack.core

import com.gainstrack.report.{AssetTuple, PriceState}

case class PositionSet(assetBalance:Map[AssetId, Fraction]) {
  def convertTo(tgtCcy: AssetId, priceState: PriceState, date:LocalDate): PositionSet = {
    def convertEntry(ps:PositionSet, entry:(AssetId, Fraction)) = {
      val toAdd = priceState.getFX(AssetTuple(entry._1, tgtCcy), date)
        .map(_ * entry._2)
        .map(Balance(_, tgtCcy))
        .getOrElse(Balance(entry._2, entry._1)) // Unconverted value if no fx
      /*if (entry._1 != tgtCcy) {
        println(s"Adding ${toAdd} from ${entry._1} to ${tgtCcy.symbol}")
      }*/
      ps + toAdd
    }
    assetBalance.foldLeft(PositionSet())(convertEntry)
  }


  def +(rhs: Balance): PositionSet = {
    val newVal = assetBalance.getOrElse(rhs.ccy, zeroFraction) + rhs.value
    copy(assetBalance = assetBalance.updated(rhs.ccy, newVal))
  }

  def -(rhs: Balance): PositionSet = {
    val newVal = assetBalance.getOrElse(rhs.ccy, zeroFraction) - rhs.value
    copy(assetBalance = assetBalance.updated(rhs.ccy, newVal))
  }


  def +(rhs: PositionSet): PositionSet = {
    val allKeys = assetBalance.keySet ++ rhs.assetBalance.keySet
    val newMap = allKeys.map(key => key -> (assetBalance.getOrElse(key, zeroFraction) + rhs.assetBalance.getOrElse(key, zeroFraction))).toMap
    copy(assetBalance = newMap)
  }

  def -(rhs: PositionSet): PositionSet = {
    val allKeys = assetBalance.keySet ++ rhs.assetBalance.keySet
    val newMap = allKeys.map(key => key -> (assetBalance.getOrElse(key, zeroFraction) - rhs.assetBalance.getOrElse(key, zeroFraction))).toMap
    copy(assetBalance = newMap)
  }

  override def toString: String = {
    assetBalance.map(e=>s"${e._2.toDouble.formatted("%.2f")} ${e._1.symbol}").mkString(" ")
  }

}

object PositionSet {
  def apply() : PositionSet = {
    PositionSet(Map())
  }
}