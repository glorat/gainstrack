package com.gainstrack.core


case class SecurityPurchase(
                             acct: AccountId,
                             date:LocalDate,
                             security:Balance,
                             cost:Balance,
                             commission:Balance
                           ) {
  // Auto-gen the account name
  val srcAcct = s"${acct}:${cost.ccy.symbol}"
  val secAcct = s"${acct}:${security.ccy.symbol}"
  //val expenseAcct = acct.replace("Asset", "Expenses")

  // TODO: expense account
  val toTransaction : Transaction = {
    Transaction(date, "", Seq(
      Posting(srcAcct, -cost*security.value),
      Posting.withCost(secAcct, security, cost)
    ))
  }
}
object SecurityPurchase {
  private val dateRe = raw"(\d{4}-\d{2}-\d{2})"
  private val acctRe = raw"(\S+)"
  private val balanceRe = raw"(\S+ \S+)"
  private val costRe = raw"\{(\S+ \S+)\}"

  private val re =s"${dateRe} trade ${acctRe} ${balanceRe} ${costRe}".r

  def apply(acct: AccountId,
            date:LocalDate,
            security:Balance,
            cost:Balance) : SecurityPurchase = {
    apply(acct, date, security, cost, Balance(0, cost.ccy))
  }

  def apply(str:String):SecurityPurchase = {
    str match {
      case re(date, acct, security, cost) => SecurityPurchase(acct, parseDate(date), Balance.parse(security), Balance(0,""))
    }

  }
}
