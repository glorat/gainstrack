package com.gainstrack.command

import com.gainstrack.core._

object Patterns {
  val datePattern: String = raw"(\d{4}-\d{2}-\d{2})"
  val acctPattern: String = raw"(\S+)"
  val assetPattern: String = raw"([A-Z][A-Z0-9-]+)"
  val balanceMatch: String = raw"(\S+ \S+)"

  /**
   * Resolve the account argument of `earn`/`spend`, which may be written with or without its
   * mandatory root prefix: `earn Salary` and `earn Income:Salary` both mean `Income:Salary`.
   * The bare form is legacy - still parsed, but `toGainstrack` writes the prefix back in, so a
   * ledger migrates itself the first time it round-trips.
   *
   * The test is on the first SEGMENT rather than `startsWith`, which would misread `IncomeTaxSG`
   * as qualified; `Salary:AcmeCo` has a colon but no account type for a root, so it stays
   * implicit. A tag that IS rooted at an account type must be rooted at the right one, so
   * `earn Expenses:Food` is rejected rather than resolving to `Income:Expenses:Food`.
   */
  def qualifiedAccount(tag: String, expected: AccountType): AccountId = {
    val root = tag.split(":").headOption.getOrElse("")
    if (AccountType.all.exists(_.toString == root)) {
      val accountId = AccountId(tag)
      require(accountId.accountType == expected, s"${tag} is not an ${expected} account")
      accountId
    }
    else {
      AccountId(s"${expected}:${tag}")
    }
  }
}
