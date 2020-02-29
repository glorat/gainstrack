package com.gainstrack.web

import java.util.concurrent.Callable

import com.gainstrack.core.AccountCommand
import com.gainstrack.report.GainstrackGenerator
import com.google.common.cache.CacheBuilder

object GtCache {
  type K = Seq[AccountCommand]
  type V = GainstrackGenerator

  case class GCacheLoader(key: K) extends Callable[V] {
    override def call(): V = {
      GainstrackGenerator(key)
    }
  }

  private val cache = CacheBuilder.newBuilder()
    .recordStats()
    // .maximumSize(size)
    .asInstanceOf[CacheBuilder[K, V]]
    .build[K, V]

  def get(k:K) = {
    cache.get(k, GCacheLoader(k))
  }
}

