package com.gainstrack.command

import com.gainstrack.core._

case class YieldCommand(date:LocalDate, accountId:AccountId, asset:Option[AssetId], value:Amount, targetAccountIdOpt:Option[AccountId] = None, comments:Seq[String] = Seq()) extends CommandNeedsAccounts {
  val assetAccountId: AccountId = asset.map(a => accountId.subAccount(a.symbol)).getOrElse(accountId)

  val incomeAccountId: AccountId = asset.map(a => accountId.convertTypeWithSubAccount(Income, a.symbol)).getOrElse(assetAccountId.convertType(Income))
  override def commandString: String = YieldCommand.prefix

  override def description: String = s"${assetAccountId.shortName} yield ${value}"

  override def mainAccount: Option[AccountId] = Some(accountId)

  // Leave as not implemented because we actually need to sub this out mid generation to a Transfer command
  override def involvedAccounts: Set[AccountId] = ???

  def createRequiredAccounts(baseAcct:AccountCreation) : Seq[AccountCreation] = {
    require(baseAcct.accountId == accountId)
    val incomeAcct = baseAcct.copy(key = AccountKey(incomeAccountId, value.ccy), options = AccountOptions(generatedAccount = true))
    if (baseAcct.options.multiAsset) {
      // Ensure our parent can receive the yield
      val targetAccount = baseAcct.copy(key = AccountKey(accountId.subAccount(value.ccy.symbol), value.ccy), options = AccountOptions(generatedAccount = true))
      Seq(incomeAcct, targetAccount)
    }
    else {
      Seq(incomeAcct )
    }
  }

  def toTransfers(accts:Set[AccountCreation]) : Seq[Transfer] = {
    val account = accts.find(_.accountId == accountId).getOrElse(throw new IllegalStateException(s"Account ${assetAccountId} is not defined"))
    val assetAccount = accts.find(_.accountId == assetAccountId).getOrElse(throw new IllegalStateException(s"Asset account ${assetAccountId} is not defined"))
    if(account.options.multiAsset) {
      require(assetAccountId != accountId, s"MultiAsset account ${accountId} cannot have yields into itself")
      // Note: This assertion is gone because when we transfer to a multi-asset account, it will get distributed to the right subacount
      //require(value.ccy == account.key.assetId, s"MultiAsset accounts must yield same ccy (${value.ccy}) as parent ${account.key.name}")
    }
    else {
      require(assetAccountId == accountId, s"${accountId} is not a multi-asset account so cannot yield ${asset.get}")
    }

    val targetAccountId = targetAccountIdOpt.getOrElse(
      if (account.options.multiAsset) {
        accountId // Always the parent
      }
      else {
        // Funding of the parent
        assetAccount.options.fundingAccount.getOrElse(assetAccountId)
      }
    )
    val targetAccount = accts.find(_.accountId == targetAccountId).getOrElse(throw new IllegalStateException(s"Target account ${targetAccountId} does not exist"))


    Transfer(incomeAccountId, targetAccountId, date, value, value, description).toTransfers(accts)
  }

  def toGainstrack : Seq[String] = {
    val s = if (asset.isDefined) {
      s"${date} yield ${accountId.toGainstrack} ${asset.get.symbol} ${value}"
    }
    else {
      s"${date} yield ${accountId.toGainstrack} ${value}"
    }
    Seq(s)
  }

  override def toPartialDTO: AccountCommandDTO = {
    AccountCommandDTO(accountId = accountId, date = date, asset = asset, change = Some(value), otherAccount = targetAccountIdOpt)
  }

  override def withComments(newComments: Seq[String]): AccountCommand = {
    copy(comments = newComments)
  }
}

object YieldCommand extends CommandParser {

  import Patterns._
  val prefix: String = "yield"
  private val Yield = s"${datePattern} yield $acctPattern $assetPattern $balanceMatch".r
  private val SimpleYield = s"${datePattern} yield $acctPattern $balanceMatch".r


  override def parse(str: String): AccountCommand = {
    str match {
      case Yield(date, incomeTag, asset, value) =>
        YieldCommand(parseDate(date), incomeTag, Some(AssetId(asset)), value, None )
      case SimpleYield(date, incomeTag, value) =>
        YieldCommand(parseDate(date), incomeTag, None, value, None)
    }
  }
}
