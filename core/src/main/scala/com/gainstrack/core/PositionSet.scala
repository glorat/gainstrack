package com.gainstrack.core

import com.gainstrack.report.{AssetPair, PriceState}

case class PositionSet(assetBalance:Map[AssetId, Fraction]) {
  def getBalance(ccy:AssetId) : Balance = {
    val f =assetBalance.get(ccy).getOrElse(zeroFraction)
    Balance(f, ccy)
  }

  def convertTo(tgtCcy: AssetId, priceState: PriceState, date:LocalDate): PositionSet = {
    def convertEntry(ps:PositionSet, entry:(AssetId, Fraction)) = {
      val toAdd = priceState.getFX(AssetPair(entry._1, tgtCcy), date)
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

  def convertToOneOf(tgtCcys: Seq[AssetId], priceState: PriceState, date:LocalDate): PositionSet = {
    def convertEntry(ps:PositionSet, entry:(AssetId, Fraction)) = {
      val tgtCcy = tgtCcys.find(tgtCcy => priceState.getFX(AssetPair(entry._1, tgtCcy), date).isDefined).getOrElse(tgtCcys.last)
      val toAdd = priceState.getFX(AssetPair(entry._1, tgtCcy), date)
        .map(_ * entry._2)
        .map(Balance(_, tgtCcy))
        .getOrElse(Balance(entry._2, entry._1)) // Unconverted value if no fx
      ps + toAdd
    }
    assetBalance.foldLeft(PositionSet())(convertEntry)
  }

  def convertViaChain(tgtCcy: AssetId, ccyChain: Seq[AssetId], priceState: PriceState, date:LocalDate) : PositionSet = {
    ccyChain match {
      case h :: _ if (h == tgtCcy) => this
      case h :: Nil => {
        // Wrong tgtCurrency but no more in chain
        this.convertTo(tgtCcy, priceState, date)
      }
      case h :: n :: tail => {
        val converted = this.convertTo(n, priceState, date)
        converted.convertViaChain(tgtCcy, n::tail, priceState, date)
      }
    }
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