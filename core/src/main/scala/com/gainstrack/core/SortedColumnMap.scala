package com.gainstrack.core

import scala.collection.generic.CanBuildFrom
import scala.collection.parallel.{Combiner, ParMap}
import scala.collection.{GenIterable, GenMap, GenMapLike, GenSeq, GenSet, GenTraversable, GenTraversableOnce, SortedMap, immutable, mutable}
import scala.reflect.ClassTag

case class SortedColumnMap[K ,V] (ks: IndexedSeq[K], val vs:IndexedSeq[V]) {
  require(ks.length == vs.length)

  def isEmpty = ks.isEmpty
  def contains(key: K) = ks.contains(key) // FIXME: Use binary search

  def iota(key:K)(implicit kOrder:Ordering[K]) = ks.indexWhere(kOrder.compare(_, key)>0)
}

object SortedColumnMap {
//  def from[V](map: SortedMap[LocalDate,V]): SortedColumnMap[LocalDate,V] = {
//    new SortedColumnMap(map.keys.toIndexedSeq, map.values.toIndexedSeq)
//  }
  implicit val localDateOrdering: Ordering[LocalDate] = _.compareTo(_)

  def apply[K,V]():SortedColumnMap[K,V] = SortedColumnMap(IndexedSeq(), IndexedSeq())

  def from[K,V](map: SortedMap[K,V])(implicit kOrder:Ordering[K]) : SortedColumnMap[K,V] = {
    SortedColumnMap(map.keys.toIndexedSeq, map.values.toIndexedSeq)
  }
}