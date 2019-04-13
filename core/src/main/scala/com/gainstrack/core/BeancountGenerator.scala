package com.gainstrack.core

import net.glorat.cqrs.{AggregateRoot, AggregateRootState, DomainEvent}

class BeancountGenerator extends AggregateRoot {
  val headers:Seq[String] = Seq (
    "option \"title\" \"Example Beancount file\"",
    "option \"operating_currency\" \"USD\""
  )
  def toBeancount: String = {
    val lines:Seq[String] = headers ++ getState.accts.map(_.toBeancount) ++ getState.txs
    lines.mkString("\n")
  }

  override protected var state: AggregateRootState = BeancountState(java.util.UUID.randomUUID(),Seq(),Seq())

  override def id: GUID = getState.id

  override def getState: BeancountState = state.asInstanceOf[BeancountState]


}

case class BeancountState(id:GUID, accts:Seq[AccountCreation], txs:Seq[String])
extends AggregateRootState {
  def handle(e: DomainEvent): AggregateRootState = {
    e match {
      case e:AccountCreation => process(e)
      case e:Transfer => process(e)
      case e:SecurityPurchase =>  process(e)
      case e:BalanceObservation => process(e)
    }
  }

  private def process(e:AccountCreation):BeancountState = {
    copy(accts = accts :+ e)
  }

  private def process(e:Transfer):BeancountState = {
    copy(txs = txs :+ e.toTransaction.toBeancount)
  }

  private def process(e:SecurityPurchase): BeancountState = {
    copy(txs = txs :+ e.toTransaction.toBeancount)
  }

  private def process(e:BalanceObservation) = {
    copy(txs = txs ++ e.toBeancounts)
  }
}