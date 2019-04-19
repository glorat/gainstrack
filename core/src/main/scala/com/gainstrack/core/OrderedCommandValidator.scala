package com.gainstrack.core

import net.glorat.cqrs.{AggregateRoot, AggregateRootState, DomainEvent}

class OrderedCommandValidator extends AggregateRoot {
  override protected var state: AggregateRootState = ValidationState(java.util.UUID.randomUUID(),Seq())

  override def id: GUID = getState.id

  override def getState: ValidationState = state.asInstanceOf[ValidationState]
}

case class ValidationState(id:GUID, accounts:Seq[AccountCreation]) extends AggregateRootState {
  override def handle(e: DomainEvent): AggregateRootState = {
    e match {
      case e:AccountCreation => {
        process(e)
      }
      case e:Transfer => process(e)
      case e:SecurityPurchase =>  process(e)
      case e:BalanceAdjustment => process(e)
    }
  }

  private def process(e:AccountCreation): ValidationState = {
    // Check name doesn't already exist
    // Check if any chosen parent exists
    // Check guid doesn't already exist
    copy(accounts = accounts :+ e)
  }

  private def process(s:Transfer) : ValidationState = {
    val srcAccountOpt = accounts.find(x => x.name == s.source)
    val tgtAccountOpt = accounts.find(x => x.name == s.dest)
    require(srcAccountOpt.nonEmpty, s"Invalid source account: ${s.source}")
    require(tgtAccountOpt.nonEmpty, s"Invalid source account: ${s.dest}")
    val srcAccount = srcAccountOpt.get
    val tgtAccount = tgtAccountOpt.get

    require(srcAccount.key.assetId == s.sourceValue.ccy, "Source currency doesn't match")
    require(tgtAccount.key.assetId == s.targetValue.ccy, "Destination currency doesn't match")
    // No change in state
    this
  }

  private def process(e:SecurityPurchase) : ValidationState = {
    var ret = this
    require(accounts.exists(x => x.name == e.accountId))
    val acct = accounts.find(x => x.name == e.accountId).getOrElse(throw new IllegalArgumentException(s"${e.accountId} account must exist"))
    if (!accounts.exists(x => x.name == e.srcAcct)) {
      // Auto vivify sub-accounts of securities account
      val newAcct = acct.copy(key = AccountKey(e.srcAcct, e.cost.ccy))
      ret = copy(accounts = accounts :+ newAcct)
    }
    if (!accounts.exists(x => x.name == e.secAcct)) {
      // Auto vivify sub-accounts of securities account
      val newAcct = acct.copy(key = AccountKey(e.secAcct, e.security.ccy))
      ret=copy(accounts = accounts :+ newAcct)
    }
    ret
  }

  private def process(e:BalanceAdjustment) : ValidationState = {
    this
  }
}