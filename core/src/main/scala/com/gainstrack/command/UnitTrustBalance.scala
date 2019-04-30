package com.gainstrack.command

import com.gainstrack.core._

/**
  * Unit trusts that continually reinvest your income into units
  * The individual transaction records are too unwieldy - they just
  * give you your new updated balances include accumulated units and
  * with costs already deducted
  *
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
  val expenseAccountId = accountId.replace("Assets:", "Expenses:")+s":${price.ccy.symbol}"

  val securityAccountId = accountId + s":${security.ccy.symbol}"

  def toBeancountCommand(oldBalance:Balance) : BeancountCommand = {
    if (security == oldBalance) {
      // No transaction just emit a price
      PriceObservation(date, security.ccy, price)
    }
    else {
      toTransaction(oldBalance)
    }
  }

  def toBeancount(oldBalance:Balance) : String = {
    if (security == oldBalance) {
      // No transaction just emit a price
      PriceObservation(date, security.ccy, price).toBeancount
    }
    else {
      toTransaction(oldBalance).toBeancount
    }
  }

  def toTransaction(oldBalance:Balance) : Transaction = {
    val newUnits = security-oldBalance
    val unitIncrease : Posting = Posting(securityAccountId, newUnits, price )
    val income:Posting = Posting(incomeAccountId, price * -newUnits.value)
    Transaction(date, s"Unit statement: ${security} @${price}", Seq(unitIncrease, income))
  }

  def createRequiredAccounts(baseAcct:AccountCreation) : Seq[AccountCreation] = {
    require(baseAcct.accountId == accountId)
    val cashAcct = baseAcct.copy(key = AccountKey(cashAccountId, price.ccy))
    val incomeAcct = baseAcct.copy(key = AccountKey(incomeAccountId, price.ccy))
    val expenseAcct = baseAcct.copy(key = AccountKey(expenseAccountId, price.ccy))

    Seq(cashAcct, incomeAcct, expenseAcct)
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