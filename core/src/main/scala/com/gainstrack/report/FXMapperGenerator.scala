package com.gainstrack.report

import com.gainstrack.core.AssetId

class FXMapperGenerator(assetState: AssetState) {
  val fxMapper: Map[AssetId, AssetId] = assetState.allAssets.keys.flatMap(key => {
    assetState.allAssets(key).options.get("ticker").map(key -> AssetId(_))
  }).toMap

  val proxyMapper: Map[AssetId, AssetId] = assetState.allAssets.keys.flatMap(key => {
    assetState.allAssets(key).options.get("proxy").map(key -> AssetId(_))
  }).toMap
}
