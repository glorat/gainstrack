package com.gainstrack.core

import scala.collection.MapView
import scala.collection.immutable.{ArraySeq, SortedMap}
import scala.reflect.ClassTag

case class SortedColumnMap[K ,V] (ks: IndexedSeq[K], val vs:IndexedSeq[V]) {
  require(ks.length == vs.length)

  def isEmpty = ks.isEmpty
  def contains(key: K): Boolean = ks.contains(key) // FIXME: Use binary search

  // FIXME: APL iota semantics should return ks.length if key is above everything (not -1 as currently)
  def iota(key:K)(implicit kOrder:Ordering[K]): Int = ks.indexWhere(kOrder.compare(_, key)>0)

  def latestKey(key:K)(implicit kOrder:Ordering[K]): Option[K] = {
    val idx = this.iota(key)
    if (idx<0) {
      this.ks.lastOption
    }
    else if (idx == 0) {
      this.ks.headOption // Sort of shouldn't happen
    }
    else {
      Some(this.ks(idx))
    }
  }
}

object SortedColumnMap {
//  def from[V](map: SortedMap[LocalDate,V]): SortedColumnMap[LocalDate,V] = {
//    new SortedColumnMap(map.keys.toIndexedSeq, map.values.toIndexedSeq)
//  }
  implicit val localDateOrdering: Ordering[LocalDate] = _.compareTo(_)

  def apply[K,V]():SortedColumnMap[K,V] = SortedColumnMap(IndexedSeq(), IndexedSeq())

  def from[K:ClassTag,V:ClassTag](map: SortedMap[K,V])(implicit kOrder:Ordering[K]) : SortedColumnMap[K,V] = {
    val n = map.size
    val ks = new Array[K](n)
    val vs = new Array[V](n)
    var i=0
    map.foreach(kv => {
      ks(i) = kv._1
      vs(i) = kv._2
      i += 1
    })
    SortedColumnMap(ArraySeq.unsafeWrapArray(ks), ArraySeq.unsafeWrapArray(vs))
  }

  def from[K:ClassTag,V:ClassTag](map: MapView[K,V])(implicit kOrder:Ordering[K]) : SortedColumnMap[K,V] = {
    val n = map.size
    val ks = new Array[K](n)
    val vs = new Array[V](n)
    var i=0
    map.foreach(kv => {
      ks(i) = kv._1
      vs(i) = kv._2
      i += 1
    })

    SortedColumnMap(ArraySeq.unsafeWrapArray(ks), ArraySeq.unsafeWrapArray(vs))
  }
}