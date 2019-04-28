package com.gainstrack.core

case class PositionSet(assetBalance:Map[AssetId, Fraction]) {
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

}

object PositionSet {
  def apply() : PositionSet = {
    PositionSet(Map())
  }
}