package com.gainstrack.core

case class Posting (
                     account: AccountId,
                     value: Option[Balance],
                     price: Option[Balance], // @ 123 USD
                     cost: Option[Balance]   // {123 USD}

                   ) {
  val weight : Balance = {
    if (cost.isDefined) {
      cost.get * value.get.value
    }
    else if (price.isDefined) {
      price.get * value.get.value
    }
    else if (value.isDefined) {
      value.get
    }
    else {
      // Elided value from tx
      Balance(0, AssetId("USD"))
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
  def apply(account:AccountId, value:Balance):Posting = {
    apply(account, Some(value), None, None)
  }
  def apply(account:AccountId, value:Balance, price:Balance):Posting = {
    apply(account, Some(value), Some(price), None)
  }

  def withCost(account:AccountId, value:Balance, cost:Balance):Posting = {
    apply(account, Some(value), None, Some(cost))
  }

  def withCostAndPrice(account:AccountId, value:Balance, cost:Balance, price:Balance):Posting = {
    apply(account, Some(value), Some(price), Some(cost))
  }
}