package com.gainstrack.core

import com.gainstrack.report.{AssetPair, PriceState}

case class PositionSet(assetBalance:Map[AssetId, Fraction]) {

  def toDTO: Seq[Map[String,Any]] = {
    assetBalance.keys.map(getBalance(_).toDTO).toSeq
  }

  def getBalance(ccy:AssetId) : Amount = {
    val f =assetBalance.get(ccy).getOrElse(zeroFraction)
    Amount(f, ccy)
  }

  def convertTo(tgtCcy: AssetId, priceState: PriceState, date:LocalDate): PositionSet = {
    def convertEntry(ps:PositionSet, entry:(AssetId, Fraction)) = {
      val toAdd = priceState.getFX(entry._1, tgtCcy, date)
        .map(_ * entry._2)
        .map(Amount(_, tgtCcy))
        .getOrElse(Amount(entry._2, entry._1)) // Unconverted value if no fx
      /*if (entry._1 != tgtCcy) {
        println(s"Adding ${toAdd} from ${entry._1} to ${tgtCcy.symbol}")
      }*/
      ps + toAdd
    }
    assetBalance.foldLeft(PositionSet())(convertEntry)
  }

  def convertToOneOf(tgtCcys: Seq[AssetId], priceState: PriceState, date:LocalDate): PositionSet = {
    def convertEntry(ps:PositionSet, entry:(AssetId, Fraction)) = {
      val tgtCcy = tgtCcys.find(tgtCcy => priceState.getFX(entry._1, tgtCcy, date).isDefined).getOrElse(tgtCcys.last)
      val toAdd = priceState.getFX(entry._1, tgtCcy, date)
        .map(_ * entry._2)
        .map(Amount(_, tgtCcy))
        .getOrElse(Amount(entry._2, entry._1)) // Unconverted value if no fx
      ps + toAdd
    }
    assetBalance.foldLeft(PositionSet())(convertEntry)
  }

  def convertViaChain(tgtCcy: AssetId, ccyChain: Seq[AssetId], priceState: PriceState, date:LocalDate) : PositionSet = {
    require(ccyChain.headOption.isDefined, s"No ccyChain was passed for $tgtCcy")
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

  def +(rhs: Amount): PositionSet = {
    val newVal = assetBalance.getOrElse(rhs.ccy, zeroFraction) + rhs.number
    copy(assetBalance = assetBalance.updated(rhs.ccy, newVal))
  }

  def -(rhs: Amount): PositionSet = {
    val newVal = assetBalance.getOrElse(rhs.ccy, zeroFraction) - rhs.number
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