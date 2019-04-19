package com.gainstrack.core.test

import com.gainstrack.core.SecurityPurchase
import org.scalatest.FlatSpec

class ParsingTest extends FlatSpec {
  "Trade" should "parse trade with cost" in {
    val str = "2010-01-01 trade Assets:Broker 10 IVV {12.3 USD}"
    val trade = SecurityPurchase(str)
    //val txs = trade.toTransaction
  }
}
