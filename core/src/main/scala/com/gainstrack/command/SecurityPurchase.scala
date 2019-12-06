package com.gainstrack.command

import com.gainstrack.core._

case class SecurityPurchase(
                             accountId: AccountId,
                             date:LocalDate,
                             security:Amount,
                             price:Amount,
                             commission:Amount
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
  override def commandString: String = SecurityPurchase.prefix

  def description : String = {
    val buysell = if (security.number>0) "BUY" else "SELL"
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
    val expense = (-price*security.number - commission)

    var postings = Seq(
      Posting(cashAccountId, expense),
      Posting(securityAccountId, security, price)
    )
    if (commission.number != zeroFraction) {
      // TODO: currency match check?
      postings = postings :+ Posting(expenseAcctId, commission)
    }

    Transaction(date, description, postings, this )
  }

  override def toGainstrack: Seq[String] = {
    val baseStr = s"${date} trade ${accountId.toGainstrack} ${security} @${price}"
    Seq(baseStr + (if (commission.number==zeroFraction) "" else s" C${commission}"))
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
            security:Amount,
            cost:Amount) : SecurityPurchase = {
    apply(acct, date, security, cost, Amount(0, cost.ccy))
  }

  def parse(str:String):SecurityPurchase = {
    str match {
      case PurchaseWithCommision(date, acct, security, cost, commission) =>
        SecurityPurchase(AccountId(acct), parseDate(date), Amount.parse(security), cost, Amount.parse(commission))
      case Purchase(date, acct, security, cost) => SecurityPurchase(AccountId(acct), parseDate(date), Amount.parse(security), cost)
    }
  }

  def apply(str:String) = parse(str)
}