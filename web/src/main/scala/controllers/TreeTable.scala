package controllers

import com.gainstrack.command.AccountCreation
import com.gainstrack.core._
import com.gainstrack.report._
import controllers.MainController.UrlFn

import scala.xml.Elem

class TreeTable(acctState:AccountState, priceState:PriceState, date:LocalDate, balanceReport:BalanceReport, url_for:UrlFn) {

  import org.fusesource.scalate.RenderContext.capture

  val allAcctState = acctState.withInterpolatedAccounts

  def account_name(account_name: AccountId, last_segment: Boolean = false) = {

    <a href={url_for("account", Map("name" -> account_name.toString))} class="account">
      {if (last_segment) account_name.shortName else account_name}
    </a>
  }

  def foo(acctId: AccountId):Elem = {
    val balance = balanceReport.getState.convertedPosition(acctId, acctState, priceState, date)

    val dropTarget = " has-children"
    val depth=0
    val classStr = s"account-cell depth-$depth droptarget${dropTarget}"
    val pStr = if (balance.assetBalance.size > 0) "has_balance" else ""

    <ol class="tree-table" title="{{ table_hover_text }}">
      <li class="head">
        <p>
          <span class="account-cell">
            <button type="button" class="link expand-all hidden" title="Expand all accounts">Expand all</button>
          </span>
          <span class="other">Value</span>
        </p>
      </li>
      <li class="">
        <p class={pStr}>
          <span class={classStr} data-account-name={acctId.toString}>
            {account_name(acctId, true)}
          </span>
          <span class="num other">
            {balance.assetBalance.map(e=>s"${e._2.toDouble.formatted("%.2f")} ${e._1.symbol}").map(x => <span>{x}</span><br />)}
          </span>
        </p>
        <ol>
          {bar(acctId,1)}
        </ol>
      </li>


    </ol>
  }

  def bar(acctId: AccountId, depth:Int=0):Seq[Elem] = {
    // FIXME: Raw get
    //val account: AccountCreation = allAcctState.find(acctId)

    for (childAccount <- allAcctState.childrenOf(acctId)) yield {
      //val balance: PositionSet = balanceReport.getState.totalPosition(childAccount.name)
      val balance = balanceReport.getState.convertedPosition(childAccount.accountId, acctState, priceState, date)

      val dropTarget = if (allAcctState.childrenOf(childAccount.name).size > 0) " has-children" else ""
      val classStr = s"account-cell depth-$depth droptarget${dropTarget}"
      val pStr = if (balance.assetBalance.size > 0) "has_balance" else ""
      <li class="">
        <p class={pStr}>
          <span class={classStr} data-account-name={acctId.toString}>
            {account_name(childAccount.accountId, true)}
          </span>
          <span class="num other">
            {balance.assetBalance.map(e=>s"${e._2.toDouble.formatted("%.2f")} ${e._1.symbol}").map(x => <span>{x}</span><br />)}
          </span>
        </p>
        <ol>
          {bar(childAccount.name, depth + 1)}
        </ol>
      </li>
    }
  }.toSeq
}
