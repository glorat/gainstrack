package com.gainstrack.report

import com.gainstrack.core.{AccountId, AssetId}

case class AssetChainMap(map:Map[AccountId, Seq[AssetId]]) {
  def apply(acctId:AccountId):Seq[AssetId]  = map.apply(acctId)

  def findFirst(srcCcy:AssetId):Option[Seq[AssetId]] = {
    val matched = map.find( (kv) => kv._2.head == srcCcy)
    matched.map(_._2)
  }
}
object AssetChainMap {

  def apply(acctState: AccountState, priceState: PriceState): AssetChainMap = {
    def assetChainFor(accountId: AccountId): Seq[AssetId] = {
      acctState.accountMap.get(accountId).map(acct => {
        val parentChain = acct.parentAccountId
          .map(pid => assetChainFor(pid))
          .getOrElse(Seq(acctState.baseCurrency))
        parentChain match {
            // Same ccy as parent
          case h :: _ if h ==acct.key.assetId => parentChain
            // Different from parent
          case _ => {
            val available = priceState.prices.keys.filter(pair => pair.fx1 == acct.key.assetId.symbol)
            if (available.size == 1
              && !parentChain.contains(available.head.fx2)
              && available.head.fx2 != parentChain.headOption.map(_.symbol).getOrElse(":NA:")
            ) {
              // There's only one possible conversion and it isn't in our chain
              // May as well go there since there is nowhere else to go
              // TODO: Consider doing this even if available.size>1
              acct.key.assetId +: AssetId(available.head.fx2) +: parentChain
            }
            else {
              acct.key.assetId +: parentChain
            }
          }
        }
      }).getOrElse(accountId.parentAccountId.map(assetChainFor(_)).getOrElse(Seq(acctState.baseCurrency)))

    }


    val accounts = acctState.accounts
    val map:Map[AccountId, Seq[AssetId]] = accounts.map(a => a.accountId -> assetChainFor(a.accountId)).toMap
    AssetChainMap(map)
  }
}