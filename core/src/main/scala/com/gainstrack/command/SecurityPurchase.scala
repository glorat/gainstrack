package com.gainstrack.command

import com.gainstrack.core._

case class SecurityPurchase(
                             accountId: AccountId,
                             date:LocalDate,
                             security:Balance,
                             price:Balance,
                             commission:Balance
                           ) extends AccountCommand {

  // Auto-gen the account name
  val cashAccountId = s"${accountId}:${price.ccy.symbol}"
  val securityAccountId = s"${accountId}:${security.ccy.symbol}"
  val incomeAcctId = accountId.replace("Assets:", "Income:")+s":${price.ccy.symbol}"
  val expenseAcctId = accountId.replace("Assets:", "Expenses:")+s":${price.ccy.symbol}"
  val requiredAccountIds:Seq[AccountId] = Seq(cashAccountId, securityAccountId, incomeAcctId, expenseAcctId)

  //val expenseAcct = acct.replace("Asset", "Expenses")

  def toDescription : String = {
    val buysell = if (security.value>0) "BUY" else "SELL"
    s"${buysell} ${security} @${price}"
  }

  def createRequiredAccounts(baseAcct:AccountCreation) : Seq[AccountCreation] = {
    require(baseAcct.accountId == accountId)
    val cashAcct = baseAcct.copy(key = AccountKey(cashAccountId, price.ccy))
    val incomeAcct = baseAcct.copy(key = AccountKey(incomeAcctId, price.ccy))
    val expenseAcct = baseAcct.copy(key = AccountKey(expenseAcctId, price.ccy))

    Seq(cashAcct, incomeAcct, expenseAcct)
  }

  def toTransaction(opts:AccountOptions) : Transaction = {
    val expense = (-price*security.value - commission)
    require(opts.expenseAccount.isDefined || commission.value == zeroFraction)

    var postings = Seq(
      Posting(cashAccountId, expense),
      Posting(securityAccountId, security, price)
    )
    if (commission.value != zeroFraction) {
      // TODO: currency match check?
      postings = postings :+ Posting(opts.expenseAccount.get, commission)
    }

    Transaction(date, toDescription, postings )
  }
}

object SecurityPurchase extends CommandParser {
  import Patterns._

  val prefix = "trade"
  private val balanceRe = raw"(\S+ \S+)"
  private val costRe = raw"@(\S+ \S+)"

  private val Purchase =s"${datePattern} ${prefix} ${acctPattern} ${balanceRe} ${costRe}".r
  private val PurchaseWithCommision =s"${datePattern} ${prefix} ${acctPattern} ${balanceRe} ${costRe} C${balanceRe}".r

  def apply(acct: AccountId,
            date:LocalDate,
            security:Balance,
            cost:Balance) : SecurityPurchase = {
    apply(acct, date, security, cost, Balance(0, cost.ccy))
  }

  def parse(str:String):SecurityPurchase = {
    str match {
      case PurchaseWithCommision(date, acct, security, cost, commission) =>
        SecurityPurchase(acct, parseDate(date), Balance.parse(security), cost, Balance.parse(commission))
      case Purchase(date, acct, security, cost) => SecurityPurchase(acct, parseDate(date), Balance.parse(security), cost)
    }
  }

  def apply(str:String) = parse(str)
}