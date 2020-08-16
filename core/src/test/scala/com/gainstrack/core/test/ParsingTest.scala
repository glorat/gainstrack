package com.gainstrack.core.test

import com.gainstrack.command.SecurityPurchase
import org.scalatest.flatspec.AnyFlatSpec

class ParsingTest extends AnyFlatSpec {
  "Trade" should "parse trade with cost" in {
    val str = "2010-01-01 trade Assets:Broker 10 IVV @12.3 USD"
    val trade = SecurityPurchase(str)
    //val txs = trade.toTransaction
    assert(SecurityPurchase(trade.toGainstrack.head) == trade)
  }
}
