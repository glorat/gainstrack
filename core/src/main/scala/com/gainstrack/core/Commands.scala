package com.gainstrack.core


case class SecurityPurchase(
                             acct: AccountId,
                             date:LocalDate,
                             security:Balance,
                             cost:Balance,
                             commission:Balance
                           ) extends AccountCommand {
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
object SecurityPurchase extends CommandParser {
  import Patterns._
  val prefix = "trade"
  private val balanceRe = raw"(\S+ \S+)"
  private val costRe = raw"\{(\S+ \S+)\}"

  private val re =s"${datePattern} ${prefix} ${acctPattern} ${balanceRe} ${costRe}".r

  def apply(acct: AccountId,
            date:LocalDate,
            security:Balance,
            cost:Balance) : SecurityPurchase = {
    apply(acct, date, security, cost, Balance(0, cost.ccy))
  }

  def parse(str:String):SecurityPurchase = {
    str match {
      case re(date, acct, security, cost) => SecurityPurchase(acct, parseDate(date), Balance.parse(security), cost)
    }
  }

  def apply(str:String) = parse(str)
}

/** Generates postings based on costs for money transfers */
case class Transfer(
                     source: AccountId,
                     dest: AccountId,
                     date: LocalDate,
                     sourceValue: Balance,
                     targetValue: Balance
                   ) extends AccountCommand {
  if (sourceValue.ccy == targetValue.ccy) {
    require(sourceValue.value == targetValue.value, "Single transfer amount must match (until fees supported")
  }

  def fxRate:Fraction = {
    targetValue.value/sourceValue.value
  }

  def toTransaction : Transaction = {
    Transaction(date, "", Seq(
      Posting(source, -sourceValue, Balance(fxRate,targetValue.ccy)),
      Posting(dest, targetValue)
    ))
  }

}

object Transfer extends CommandParser {
  val prefix = "tfr"
  import Patterns._
  private val balanceRe = raw"(\S+ \S+)"
  private val re =s"${datePattern} ${prefix} ${acctPattern} ${acctPattern} ${balanceRe} ${balanceRe}".r

  override def parse(str: String): Transfer = {
    str match {
      case re(date, srcAcct, tgtAcct, srcValue, tgtValue) =>
        Transfer(srcAcct, tgtAcct, parseDate(date), srcValue, tgtValue)
    }
  }
}
