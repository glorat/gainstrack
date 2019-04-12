package com.gainstrack.core

import net.glorat.cqrs.{AggregateRoot, AggregateRootState, DomainEvent}

class UserExperienceValidator extends AggregateRoot {
  override protected var state: AggregateRootState = ValidationState(java.util.UUID.randomUUID(),Seq())

  override def id: GUID = getState.id

  override def getState: ValidationState = state.asInstanceOf[ValidationState]
}

case class ValidationState(id:GUID, accounts:Seq[AccountKey]) extends AggregateRootState {
  override def handle(e: DomainEvent): AggregateRootState = {
    e match {
      case e:AccountCreation => {
        process(e)
      }
      case e:Transfer => process(e)
    }
  }

  private def process(e:AccountCreation): ValidationState = {
    // Check name doesn't already exist
    // Check if any chosen parent exists
    // Check guid doesn't already exist
    copy(accounts = accounts :+ e.key)
  }

  private def process(s:Transfer) : ValidationState = {
    val srcAccountOpt = accounts.find(x => x.guid == s.source)
    val tgtAccountOpt = accounts.find(x => x.guid == s.dest)
    require(srcAccountOpt.nonEmpty, "Invalid source account")
    require(tgtAccountOpt.nonEmpty, "Invalid source account")
    val srcAccount = srcAccountOpt.get
    val tgtAccount = tgtAccountOpt.get

    require(srcAccount.assetId == s.sourceValue.ccy, "Source currency doesn't match")
    require(tgtAccount.assetId == s.targetValue.ccy, "Destination currency doesn't match")
    // No change in state
    this
  }
}