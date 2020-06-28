package com.gainstrack.command

import com.gainstrack.core._
import com.gainstrack.report.AccountState

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
                             security: Amount,
                             price:Amount
                           ) extends AccountCommand {

  def value:Amount = price * security.number

  require(accountId.accountType == Assets)
  val cashAccountId = accountId.subAccount(price.ccy.symbol)
  val incomeAccountId = accountId.convertTypeWithSubAccount(Income, price.ccy.symbol)
  val expenseAccountId = accountId.convertTypeWithSubAccount(Expenses, price.ccy.symbol)
  val securityAccountId = accountId.subAccount(security.ccy.symbol)

  override def commandString: String = UnitTrustBalance.prefix
  def description:String = s"Unit statement: ${security} @${price}"
  override def mainAccount: Option[AccountId] = Some(accountId)
  // FIXME: If no change in units, then accounts are not involved!
  // Need a command post processing step to update this fact
  override def involvedAccounts: Set[AccountId] = Set(securityAccountId, incomeAccountId)

  def toBeancountCommand(oldBalance:Amount)(acctState:AccountState) : BeancountCommand = {
    if (security == oldBalance) {
      // No transaction just emit a price
      PriceObservation(date, security.ccy, price, Some(this))
    }
    else {
      toTransaction(oldBalance, acctState).get
    }
  }

  def toTransaction(oldBalance:Amount, acctState: AccountState) : Option[Transaction] = {
    val account = acctState.find(accountId).getOrElse(throw new IllegalStateException(s"${accountId} does not exist for unit command"))

    val newUnits = security-oldBalance
    val unitIncrease : Posting = Posting(securityAccountId, newUnits, price )
    val adjAccount = if ( (oldBalance.number.isZero || security.number.isZero) ) {
      // Trading to/from a zero means we should obtain funding, rather than make money
      if (account.options.multiAsset && !account.options.automaticReinvestment) {
        // Fund from self
        accountId
      }
      else if (account.options.multiAsset && account.options.automaticReinvestment) {
        // for automaticReinvestment, we pull from income account
        incomeAccountId
      }
      else {
        // Semantics TBD but let's stick with the safe choice for now
        // account.options.fundingAccount.getOrElse(incomeAccountId)
        incomeAccountId
      }

    }
    else {
      incomeAccountId
    }

    if (newUnits.number.isZero) {
      None
    }
    else if (newUnits.number.abs < 0.0000001) {
      // Rounding must have happened that is bad
      throw new IllegalStateException("BUG: Internal FX handling gone wrong in UnitTrustBalance")
    }
    else {
      val tfr = Transfer(adjAccount, accountId, date, price * newUnits.number, newUnits, description)
      Some(tfr.toTransfers(acctState.accounts).head.toTransaction.copy(origin = this))
    }


    //val income:Posting = Posting(adjAccount, price * -newUnits.value)
    //Transaction(date, description, Seq(unitIncrease, income), this)
  }

  def createRequiredAccounts(baseAcct:AccountCreation) : Seq[AccountCreation] = {
    require(baseAcct.accountId == accountId)
    require(baseAcct.options.multiAsset, s"Base account for unit trust ${baseAcct.accountId} is not multi-asset")
    val cashAcct = baseAcct.copy(key = AccountKey(cashAccountId, price.ccy), options = baseAcct.options.copy(multiAsset = false, generatedAccount = true))
    val incomeAcct = baseAcct.copy(key = AccountKey(incomeAccountId, price.ccy), options = baseAcct.options.copy(multiAsset = false, generatedAccount = true))
    val expenseAcct = baseAcct.copy(key = AccountKey(expenseAccountId, price.ccy), options = baseAcct.options.copy(multiAsset = false, generatedAccount = true))
    val expenseAcctBase = baseAcct.copy(key = AccountKey(accountId.convertType(Expenses), baseAcct.key.assetId ),
      options = AccountOptions(multiAsset = true, generatedAccount = true))
    val incomeAcctBase = baseAcct.copy(key = AccountKey(accountId.convertType(Income), baseAcct.key.assetId ),
      options = AccountOptions(multiAsset = true, generatedAccount = true))
    Seq(cashAcct, incomeAcct, expenseAcct, expenseAcctBase, incomeAcctBase)
  }

  def toGainstrack : Seq[String] = {
    Seq(s"${date} unit ${accountId.toGainstrack} ${security} @${price}")
  }

  override def toPartialDTO: AccountCommandDTO = {
    AccountCommandDTO(accountId = accountId, date = date, balance = Some(security), price = Some(price))
  }
}
object UnitTrustBalance extends CommandParser {
  import Patterns._

  val prefix = "unit"
  private val priceRe = raw"@(\S+ \S+)"

  private val Statement =s"${datePattern} ${prefix} ${acctPattern} ${balanceMatch} ${priceRe}".r
/*
  def apply(acct: AccountId,
            date:LocalDate,
            security:Balance,
            price:Balance) : UnitTrustBalance = {
    apply(acct, date, security, price)
  }*/

  def parse(str:String):UnitTrustBalance = {
    str match {
      case Statement(date, acct, security, price) => UnitTrustBalance(AccountId(acct), parseDate(date), Amount.parse(security), price)
    }
  }


}