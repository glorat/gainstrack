package com.gainstrack.core

case class AccountCommandDTO(
                            accountId: AccountId,
                            date: LocalDate,
                            asset: Option[AssetId] = None,
                            change: Option[Amount] = None,
                            balance: Option[Amount] = None,
                            price: Option[Amount] = None,
                            otherAccount: Option[AccountId] = None,
                            commission: Option[Amount] = None,
                            options: Option[Object] = None,
                            commandType: Option[String] = None,
                            description: Option[String] = None,
                            ) {
  def autoFill(cmd:AccountCommand) :AccountCommandDTO = {
    this.copy(
      commandType = Some(cmd.commandString),
      description = Some(cmd.description)
    )
  }
}
