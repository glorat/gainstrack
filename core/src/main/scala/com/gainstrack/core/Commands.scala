package com.gainstrack.core

/**
  * Unit trusts that continually reinvest your income into units
  * The individual transaction records are too unwieldy - they just
  * give you your new updated balances include accumulated units and
  * with costs already deducted
  * @param accountId
  * @param date
  * @param security
  * @param units
  * @param price
  */
case class UnitTrustBalance(
                           accountId: AccountId,
                           date: LocalDate,
                           security: Balance,
                           price:Balance
                           ) extends AccountCommand {
  def value:Balance = price * security.value

  require(accountId.startsWith("Assets:"))
  val cashAccountId = accountId + s":${price.ccy.symbol}"
  val incomeAccountId = accountId.replace("Assets:", "Income:")+s":${price.ccy.symbol}"
  val securityAccountId = accountId + s":${security.ccy.symbol}"

  def toBeancount(oldBalance:Balance) : String = {
    if (security == oldBalance) {
      // No transaction just emit a price
      PriceObservation(date, security.ccy, price).toBeancount
    }
    else {
      toTransaction(oldBalance).toBeancount
    }
  }

  private def toTransaction(oldBalance:Balance) : Transaction = {
    val newUnits = security-oldBalance
    val unitIncrease : Posting = Posting(securityAccountId, newUnits, price )
    val income:Posting = Posting(incomeAccountId, price * -newUnits.value)
    Transaction(date, s"Unit statement: ${security} @${price}", Seq(unitIncrease, income))
  }

  def createRequiredAccounts(baseAcct:AccountCreation) : Seq[AccountCreation] = {
    require(baseAcct.accountId == accountId)
    val newBaseAccount = AccountCreation(baseAcct.date, AccountKey(cashAccountId, price.ccy))
    val cashAcct = newBaseAccount.copy(key = AccountKey(cashAccountId + s":${price.ccy.symbol}", price.ccy))
    val incomeAcct = newBaseAccount.copy(key = AccountKey(incomeAccountId, price.ccy))
    // val expenseAcct = newBaseAccount.copy(key = AccountKey(expenseAcctId, price.ccy))

    Seq(newBaseAccount, cashAcct, incomeAcct)
  }
}
object UnitTrustBalance extends CommandParser {
  import Patterns._
  val prefix = "unit"
  private val balanceRe = raw"(\S+ \S+)"
  private val priceRe = raw"@(\S+ \S+)"

  private val Statement =s"${datePattern} ${prefix} ${acctPattern} ${balanceRe} ${priceRe}".r
/*
  def apply(acct: AccountId,
            date:LocalDate,
            security:Balance,
            price:Balance) : UnitTrustBalance = {
    apply(acct, date, security, price)
  }*/

  def parse(str:String):UnitTrustBalance = {
    str match {
      case Statement(date, acct, security, price) => UnitTrustBalance(acct, parseDate(date), Balance.parse(security), price)
    }
  }


}

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
    val newBaseAccount = AccountCreation(baseAcct.date, AccountKey(cashAccountId, price.ccy))
    val cashAcct = newBaseAccount.copy(key = AccountKey(cashAccountId + s":${price.ccy.symbol}", price.ccy))
    val incomeAcct = newBaseAccount.copy(key = AccountKey(incomeAcctId, price.ccy))
    val expenseAcct = newBaseAccount.copy(key = AccountKey(expenseAcctId, price.ccy))

    Seq(newBaseAccount, cashAcct, incomeAcct, expenseAcct)
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

/** Generates postings based on costs for money transfers */
case class Transfer(
                     source: AccountId,
                     dest: AccountId,
                     date: LocalDate,
                     sourceValue: Balance,
                     targetValue: Balance
                   ) extends AccountCommand {
  def accountId : AccountId = source // Source is where the action was triggered!

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
  private val FxTransfer =s"${datePattern} ${prefix} ${acctPattern} ${acctPattern} ${balanceRe} ${balanceRe}".r
  private val SimpleTransfer = s"${datePattern} ${prefix} ${acctPattern} ${acctPattern} ${balanceRe}".r

  override def parse(str: String): Transfer = {
    str match {
      case FxTransfer(date, srcAcct, tgtAcct, srcValue, tgtValue) =>
        Transfer(srcAcct, tgtAcct, parseDate(date), srcValue, tgtValue)
      case SimpleTransfer(date, srcAcct, tgtAcct, value) =>
        Transfer(srcAcct, tgtAcct, parseDate(date), value, value)
    }
  }
}

case class BalanceAdjustment(
                              date: LocalDate, // post or enter?
                              accountId:AccountId,
                              balance:Balance,
                              adjAccount:AccountId
                            ) extends AccountCommand {
  /*val relatedAccount : AccountId = {
    val parts:Seq[String] = accountId.split(":").updated(0,"Equity").toSeq
    parts.mkString(":")
  }*/
  def toBeancounts : Seq[String] = {
    val l1 = s"${date.minusDays(1)} pad ${accountId} ${adjAccount}"
    val l2 = s"${date} balance ${accountId} ${balance}"
    Seq(l1,l2)
  }
}

object BalanceAdjustment extends CommandParser {
  import Patterns._

  val prefix: String = "adj"
  private val balanceRe = raw"(\S+ \S+)"
  private val re =s"${datePattern} ${prefix} ${acctPattern} ${balanceRe} ${acctPattern}".r

  override def parse(str: String): BalanceAdjustment = {

    str match {
      case re(date, acct, balance, adjAcct) => {
        BalanceAdjustment(parseDate(date), acct, balance, adjAcct)
      }
    }
  }

}

case class PriceObservation(date:LocalDate, assetId: AssetId, price:Balance) extends AccountCommand {
  def toBeancount : String = {
     s"${date} price ${assetId.symbol} ${price}"
  }
}

object PriceObservation extends CommandParser {
  import Patterns._
  val prefix:String = "price"
  private val re = s"${datePattern} ${prefix} (\\S+) ${balanceMatch}".r

  override def parse(str: String):PriceObservation = {
    str match {
      case re(date, assetId, balance) => {
        PriceObservation(parseDate(date), AssetId(assetId), balance)
      }
    }
  }

}