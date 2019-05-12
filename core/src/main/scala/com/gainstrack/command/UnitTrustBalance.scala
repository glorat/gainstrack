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

  require(accountId.accountType == Assets)
  val cashAccountId = accountId.subAccount(price.ccy.symbol)
  val incomeAccountId = accountId.convertTypeWithSubAccount(Income, price.ccy.symbol)
  val expenseAccountId = accountId.convertTypeWithSubAccount(Expenses, price.ccy.symbol)
  val securityAccountId = accountId.subAccount(security.ccy.symbol)

  def description:String = s"Unit statement: ${security} @${price}"
  override def mainAccounts: Set[AccountId] = Set(accountId)
  // FIXME: If no change in units, then accounts are not involved!
  // Need a command post processing step to update this fact
  override def involvedAccounts: Set[AccountId] = Set(securityAccountId, incomeAccountId)

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
    Transaction(date, description, Seq(unitIncrease, income), this)
  }

  def createRequiredAccounts(baseAcct:AccountCreation) : Seq[AccountCreation] = {
    require(baseAcct.accountId == accountId)
    val cashAcct = baseAcct.copy(key = AccountKey(cashAccountId, price.ccy), options = baseAcct.options.copy(multiAsset = false))
    val incomeAcct = baseAcct.copy(key = AccountKey(incomeAccountId, price.ccy), options = baseAcct.options.copy(multiAsset = false))
    val expenseAcct = baseAcct.copy(key = AccountKey(expenseAccountId, price.ccy), options = baseAcct.options.copy(multiAsset = false))

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
      case Statement(date, acct, security, price) => UnitTrustBalance(AccountId(acct), parseDate(date), Balance.parse(security), price)
    }
  }


}