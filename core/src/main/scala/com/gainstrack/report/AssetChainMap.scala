package com.gainstrack.report

import com.gainstrack.core.{AccountId, AssetId}

case class AssetChainMap(map:Map[AccountId, Seq[AssetId]]) {
  def apply(acctId:AccountId):Seq[AssetId]  = map.apply(acctId)
}
object AssetChainMap {

  def apply(acctState: AccountState): AssetChainMap = {
    def assetChainFor(accountId: AccountId): Seq[AssetId] = {
      acctState.accountMap.get(accountId).map(acct => {
        val parentChain = acct.parentAccountId
          .map(pid => assetChainFor(pid))
          .getOrElse(Seq(acctState.baseCurrency))
        parentChain match {
          case h :: _ if h ==acct.key.assetId => parentChain
          case _ => acct.key.assetId +: parentChain
        }
      }).getOrElse(accountId.parentAccountId.map(assetChainFor(_)).getOrElse(Seq(acctState.baseCurrency)))

    }


    val accounts = acctState.accounts
    val map:Map[AccountId, Seq[AssetId]] = accounts.map(a => a.accountId -> assetChainFor(a.accountId))(collection.breakOut)
    AssetChainMap(map)
  }
}