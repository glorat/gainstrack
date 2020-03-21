package com.gainstrack.report

import com.gainstrack.core._

object NetworthReport {
  def byAsset(date: LocalDate, baseCcy: AssetId)(accountState: AccountState, balanceState: BalanceState, assetState: AssetState, singleFXConverter: SingleFXConverter) = {
    val nw = networth(date)(balanceState)

    val assets = assetState.allAssets.values.toSeq.sortBy(_.asset.symbol)
    assets.map(assetInfo => {
      val nwAccounts = accountState.mainAccounts.filter(_.accountId.accountType match {case Assets|Liabilities => true; case _ => false})
      val accountNetworth = nwAccounts.toSeq.flatMap(acct => {
        balanceState.totalPosition(acct.accountId, date).assetBalance.get(assetInfo.asset).map( units => {
          NetworthSubByAccountDTO(acct.accountId, units)
        })
      })

      NetworthByAssetDTO(
        assetId = assetInfo.asset,
        units = nw.getBalance(assetInfo.asset).number,
        value = nw.getBalance(assetInfo.asset).convertTo(baseCcy, singleFXConverter, date).number,
        price = singleFXConverter.getFX(assetInfo.asset, baseCcy, date).getOrElse(0.0),
        priceDate = singleFXConverter.latestDate(assetInfo.asset, date),
        accountNetworth = accountNetworth
      )
    })

  }

  def networth(date: LocalDate)(balanceState: BalanceState): PositionSet = {
    // Note that it is plus since liabilties are held in negative
    balanceState.totalPosition("Assets", date) + balanceState.totalPosition("Liabilities", date)
  }
}

case class NetworthByAssetDTO(
                               assetId: AssetId,
                               units: Fraction,
                               value: Fraction, // in base currency
                               price: Double,
                               priceDate: Option[LocalDate],
                               accountNetworth: Seq[NetworthSubByAccountDTO] = Seq()
                             )

case class NetworthSubByAccountDTO(
                                    accountId: AccountId,
                                    units: Fraction
                                  )