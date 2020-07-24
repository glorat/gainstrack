package com.gainstrack.report

import com.gainstrack.command._
import com.gainstrack.core._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}


object AccountState {
  def defaultRoot(baseCcy:AssetId):AccountCreation = {
    AccountCreation(MinDate, AccountKey("", baseCcy), AccountOptions(placeholder = true, generatedAccount = true))
  }

  def apply() : AccountState = AccountState(Set())


  private def ensureExists(state:AccountState, accountId:AccountId):AccountState = {
    if (state.accounts.exists(_.accountId == accountId)) {
      state
    }
    else {
      val parentId = accountId.parentAccountId.getOrElse(throw new IllegalStateException(s"'${accountId}' is missing parent"))
      val withParent = ensureExists(state, parentId)
      // Infinite loop sanity check
      val parent = withParent.accountMap(parentId)
      val account = AccountCreation(parent.date, AccountKey(accountId, parent.key.assetId)).copy(options = AccountOptions(generatedAccount = true))
      withParent.copy(withParent.accounts + account)
    }
  }


}

case class AccountState(accounts:Set[AccountCreation], baseCurrency:AssetId = AssetId("USD"))
  extends AggregateRootState {

  lazy val accountMap:Map[AccountId, AccountCreation] = accounts.map(a => a.accountId -> a)(collection.breakOut)
  lazy val childrenMap: Map[AccountId, Seq[AccountId]] = accounts
    .map(acct => acct.accountId -> accounts.map(_.accountId)
      .filter(_.parentAccountId.getOrElse(AccountId(":na:")) == acct.accountId ).toSeq).toMap

  def handle(e: DomainEvent): AccountState = {
    e match {
      case e:GlobalCommand => process(e)
      case e:AccountCreation => process(e)
      case e:Transfer => process(e)
      case e:SecurityPurchase =>  process(e)
      case e:BalanceStatement => process(e)
      case e:BalanceAdjustment => process(e)
      case e:PriceObservation => process(e)
      case e:UnitTrustBalance => process(e)
      case e:FundCommand => process(e)
      case _:EarnCommand | _:SpendCommand => this
      case e:YieldCommand => process(e)
      case e:CommodityCommand => this
    }
  }

  private def process(e:GlobalCommand):AccountState = {
    this.copy(baseCurrency = e.operatingCurrency)
  }

  private def process(e:PriceObservation):AccountState = {
    this
  }

  private def process(e:AccountCreation):AccountState = {
    copy(accounts = accounts + e)
  }

  private def process(e:Transfer):AccountState = {
    this
  }

  private def process(e:FundCommand):AccountState = {
    // Assuming that the target fund account is sorted out elsewhere?
    this
  }

  private def process(e:YieldCommand) : AccountState = {
    val baseAcct = accounts.find(x => x.name == e.accountId).getOrElse(throw new IllegalStateException(s"${e.assetAccountId} is not an open account"))
    var ret = this
    if (!accounts.exists(x => x.name == e.incomeAccountId)) {
      ret = ret.copy(accounts = ret.accounts ++ e.createRequiredAccounts(baseAcct) )
    }
    ret
  }

  private def process(e:SecurityPurchase): AccountState = {

    var ret = this
    var newLines : Seq[String] = Seq()
    val baseAcct = accounts.find(x => x.name == e.accountId).getOrElse(throw new IllegalStateException(s"${e.accountId} is not an open account"))
    var newBaseAcct = baseAcct

    if (!accounts.exists(x => x.name == e.cashAccountId)) {
      // Auto vivify sub-accounts of securities account
      val newAccts = e.createRequiredAccounts(baseAcct)
      ret = ret.copy(accounts = ret.accounts ++ newAccts)

      val newOpts = baseAcct.options.copy(
        incomeAccount = Some(e.incomeAcctId),
        expenseAccount = Some(e.expenseAcctId)/*,
        fundingAccount = Some(e.accountId)*/)

      // Update base account with related accounts
      ret = ret.copy(accounts = ret.accounts - baseAcct + baseAcct.copy(options = newOpts))

    }
    if (!accounts.exists(x => x.name == e.securityAccountId)) {
      // Auto vivify sub-accounts of securities account
      val newAcct = baseAcct.subAccount(e.security.ccy)
      ret=ret.copy(accounts = ret.accounts + newAcct)
    }
    ret
  }

  private def process(e:UnitTrustBalance):AccountState = {
    val baseAcct = accounts.find(x => x.name == e.accountId).getOrElse(throw new IllegalStateException(s"${e.accountId} is not an open account"))
    var ret = this
    if (!accounts.exists(x => x.name == e.cashAccountId)) {
      // Auto vivify sub accounts of unit trust account
      val newAccts = e.createRequiredAccounts(baseAcct)
      ret = ret.copy(accounts = ret.accounts ++ newAccts)
    }
    if (!accounts.exists(x => x.name == e.securityAccountId)) {
      // Auto vivify sub-accounts of securities account
      val newAcct = baseAcct.subAccount(e.security.ccy)
      ret=ret.copy(accounts = ret.accounts + newAcct)
    }
    ret
  }

  private def process(e:BalanceAdjustment) = {
    this
  }

  private def process(e:BalanceStatement) = {
    this
  }

  // Finalize method when all is done
  lazy val withInterpolatedAccounts : AccountState = {
    // Add a root then ensure all parents exist
    val withRoot = this.copy(accounts = accounts+AccountState.defaultRoot(baseCurrency))
    accounts.flatMap(_.accountId.parentAccountId).foldLeft(withRoot)(AccountState.ensureExists)
  }

  // Query methods
  def find(accountId:String):Option[AccountCreation] = {
    find(AccountId(accountId))
  }

  def find(accountId:AccountId):Option[AccountCreation] = {
    accounts.find(_.name == accountId)
  }

  def childrenOf(accountId:AccountId):Set[AccountCreation] = {
    accounts.filter(_.parentAccountId == Some(accountId))
  }

  def withInferredAccount(acctId:AccountId):AccountState = {
    val parentAccountOpt:Option[AccountCreation] = acctId.parentAccountId.flatMap(parentId => this.accounts.find(_.accountId == parentId))
    if (parentAccountOpt.isDefined) {
      val parentAccount = parentAccountOpt.get
      require(parentAccount.options.multiAsset, s"Attempting to transfer to ${parentAccount.accountId} is not multi-asset so cannot handle ${acctId.shortName}")
      val newAcct = parentAccount.subAccount(AssetId(acctId.shortName))
      copy(accounts = this.accounts + newAcct)
    }
    else {
      this
    }
  }

  def withAsset(assetId: AssetId): Set[AccountCreation] = {
    accounts.filter(_.key.assetId == assetId)
  }

  def withAsset(assets: Set[AssetId]): Set[AccountCreation] = {
    accounts.filter(a => assets.contains(a.key.assetId))
  }

  def mainAccounts: Set[AccountCreation] = {
    accounts.filter(a => a.options.generatedAccount == false)
  }
}