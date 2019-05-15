package com.gainstrack.report

import com.gainstrack.command._
import com.gainstrack.core._
import net.glorat.cqrs.{AggregateRootState, DomainEvent}


object AccountState {
  def apply() : AccountState = AccountState(Set())
}
case class AccountState(accounts:Set[AccountCreation])
  extends AggregateRootState {

  lazy val accountMap:Map[AccountId, AccountCreation] = accounts.map(a => a.accountId -> a)(collection.breakOut)

  def handle(e: DomainEvent): AccountState = {
    e match {
      case e:AccountCreation => process(e)
      case e:Transfer => process(e)
      case e:SecurityPurchase =>  process(e)
      case e:BalanceAdjustment => process(e)
      case e:PriceObservation => process(e)
      case e:UnitTrustBalance => process(e)
      case e:FundCommand => process(e)
      case e:EarnCommand => process(e)
    }
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

  private def process(e:EarnCommand):AccountState = {
    // Assuming that the target fund account is sorted out elsewhere?
    this
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

      val newOpts = baseAcct.options.copy(incomeAccount = Some(e.incomeAcctId),
        expenseAccount = Some(e.expenseAcctId))

      // Update base account with related accounts
      ret = ret.copy(accounts = ret.accounts - baseAcct + baseAcct.copy(options = newOpts))

    }
    if (!accounts.exists(x => x.name == e.securityAccountId)) {
      // Auto vivify sub-accounts of securities account
      val newAcct = AccountCreation(baseAcct.date, AccountKey(e.securityAccountId, e.security.ccy))
        .enableTrading(e.incomeAcctId)
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
      val newAcct = AccountCreation(baseAcct.date, AccountKey(e.securityAccountId, e.security.ccy))
        .enableTrading(e.incomeAccountId)
      ret=ret.copy(accounts = ret.accounts + newAcct)
    }
    ret
  }

  private def process(e:BalanceAdjustment) = {
    this
  }

  // Query methods
  def find(accountId:String):Option[AccountCreation] = {
    accounts.find(_.name == AccountId(accountId))
  }
}