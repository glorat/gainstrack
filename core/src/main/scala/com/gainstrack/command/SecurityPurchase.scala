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
  val cashAccountId = accountId.subAccount(price.ccy.symbol)
  val securityAccountId = accountId.subAccount(security.ccy.symbol)
  val incomeAcctId = accountId.convertTypeWithSubAccount(Income, price.ccy.symbol)
  val expenseAcctId = accountId.convertTypeWithSubAccount(Expenses, price.ccy.symbol)
  val requiredAccountIds:Seq[AccountId] = Seq(cashAccountId, securityAccountId, incomeAcctId, expenseAcctId)

  override def mainAccount: Option[AccountId] = Some(accountId)
  override def involvedAccounts: Set[AccountId] = toTransaction.filledPostings.map(p => p.account).toSet

  //val expenseAcct = acct.replace("Asset", "Expenses")

  def description : String = {
    val buysell = if (security.value>0) "BUY" else "SELL"
    s"${buysell} ${security} @${price}"
  }

  def createRequiredAccounts(baseAcct:AccountCreation) : Seq[AccountCreation] = {
    require(baseAcct.accountId == accountId)
    val cashAcct = baseAcct.copy(key = AccountKey(cashAccountId, price.ccy), options = AccountOptions())
    val incomeAcct = baseAcct.copy(key = AccountKey(incomeAcctId, price.ccy), options = AccountOptions())
    val expenseAcct = baseAcct.copy(key = AccountKey(expenseAcctId, price.ccy), options = AccountOptions())

    val expenseAcctBase = baseAcct.copy(key = AccountKey(accountId.convertType(Expenses), baseAcct.key.assetId ),
      options = AccountOptions(multiAsset = true))
    val incomeAcctBase = baseAcct.copy(key = AccountKey(accountId.convertType(Income), baseAcct.key.assetId ),
      options = AccountOptions(multiAsset = true))
    Seq(cashAcct, incomeAcct, expenseAcct, expenseAcctBase, incomeAcctBase)
  }

  def toTransaction : Transaction = {
    val expense = (-price*security.value - commission)

    var postings = Seq(
      Posting(cashAccountId, expense),
      Posting(securityAccountId, security, price)
    )
    if (commission.value != zeroFraction) {
      // TODO: currency match check?
      postings = postings :+ Posting(expenseAcctId, commission)
    }

    Transaction(date, description, postings, this )
  }

  override def toGainstrack: Seq[String] = {
    val baseStr = s"${date} trade ${accountId.toGainstrack} ${security} @${price}"
    Seq(baseStr + (if (commission.value==zeroFraction) "" else s" C${commission}"))
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
        SecurityPurchase(AccountId(acct), parseDate(date), Balance.parse(security), cost, Balance.parse(commission))
      case Purchase(date, acct, security, cost) => SecurityPurchase(AccountId(acct), parseDate(date), Balance.parse(security), cost)
    }
  }

  def apply(str:String) = parse(str)
}