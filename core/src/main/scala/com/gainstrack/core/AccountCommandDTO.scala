package com.gainstrack.core

case class AccountCommandDTO(
                            accountId: AccountId,
                            date: LocalDate,
                            asset: Option[AssetId] = None,
                            change: Option[Amount] = None,
                            balance: Option[Amount] = None,
                            price: Option[Amount] = None,
                            otherAccount: Option[AccountId] = None,
                            commission: Option[Amount] = None
                            ) {

}
