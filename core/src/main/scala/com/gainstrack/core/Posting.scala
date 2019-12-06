package com.gainstrack.core

case class Posting (
                     account: AccountId,
                     value: Option[Amount],
                     price: Option[Amount], // @ 123 USD
                     cost: Option[Amount] // {123 USD}

                   ) {
  val weight : Amount = {
    if (cost.isDefined) {
      cost.get * value.get.number
    }
    else if (price.isDefined) {
      price.get * value.get.number
    }
    else if (value.isDefined) {
      value.get
    }
    else {
      // Elided value from tx
      Amount(0, AssetId("USD"))
    }
  }

  def isEmpty:Boolean = value.isEmpty // Needs eliding

  override def toString: String = {
    val sb = new StringBuilder
    sb.append(account)

    if (value.isDefined) {
      sb.append(" ")
      sb.append(value.get)
      if (cost.isDefined) {
        sb.append(s" {${cost.get}}")
      }
      if (price.isDefined) {
        sb.append(s" @${price.get}")
      }
    }
    sb.toString()
  }

}
object Posting {
  def apply(account:AccountId):Posting = {
    // Expects interpolation
    apply(account, None,None,None)
  }
  def apply(account:AccountId, value:Amount):Posting = {
    apply(account, Some(value), None, None)
  }
  def apply(account:AccountId, value:Amount, price:Amount):Posting = {
    if (price.number == 1 && price.ccy == value.ccy) {
      apply(account, Some(value), None, None)
    }
    else{
      apply(account, Some(value), Some(price), None)
    }

  }

  def withCost(account:AccountId, value:Amount, cost:Amount):Posting = {
    apply(account, Some(value), None, Some(cost))
  }

  def withCostAndPrice(account:AccountId, value:Amount, cost:Amount, price:Amount):Posting = {
    apply(account, Some(value), Some(price), Some(cost))
  }
}