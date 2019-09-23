package controllers

import java.time.LocalDate

import com.gainstrack.core.{AccountCommand, AccountId, Fraction, PositionSet, Transaction}
import com.gainstrack.report.{BalanceReport, GainstrackGenerator}
import org.scalatra.json.JacksonJsonSupport
import org.scalatra.scalate.ScalateSupport
import org.scalatra.{NotFound, ScalatraServlet}

import scala.concurrent.ExecutionContext

class AccountController (implicit val ec :ExecutionContext) extends ScalatraServlet with GainstrackController  with JacksonJsonSupport with ScalateSupport {

  get("/:accountId") {
    val urlFor:MainController.UrlFn = (path:String, params:Iterable[(String,Any)]) => url(path,params)(this.request, this.response)

    contentType="text/html"

    val bg = sessionOption.map(_("gainstrack")).getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]


    val accountId : AccountId = params("accountId")


    //bg.acctState.accountMap.get(accountId).map(account => {
    val txs = bg.txState.txsUnderAccount(accountId)

    // In reverse chrono order
    val commands = txs.map(_.origin).toSet.toSeq.sorted.reverse



    val balanceFor : AccountCommand => PositionSet = {cmd =>

      val mytxs = txs.takeWhile(_.origin != cmd) ++ txs.filter(_.origin == cmd)
      /*
       For units report...

              val mypostings = mytxs.flatMap(_.filledPostings).filter(_.account.isSubAccountOf(accountId))
              val balance = mypostings.foldLeft(PositionSet())(_ + _.value.get)
              balance*/
      val balanceReport = BalanceReport(mytxs)
      balanceReport.getState.convertedPosition(accountId, bg.acctState, bg.priceState, cmd.date)
    }

    val deltaFor : AccountCommand => PositionSet = {cmd =>
      val mytxs = txs.filter(_.origin == cmd)
      val balanceReport = BalanceReport(mytxs)
      balanceReport.getState.convertedPosition(accountId, bg.acctState, bg.priceState, cmd.date)
    }


    contentType="text/html"

      layoutTemplate("/WEB-INF/views/account.ssp",
        "short_title"->"Account",
        "accountId" -> accountId,
        "data"-> commands,
        "urlFor" -> urlFor,
        "balanceFor" -> balanceFor,
        "deltaFor" -> deltaFor
      )
    //}).getOrElse(NotFound(s"${accountId} account not found"))
  }

}

object AccountController {
  type BalanceFor = AccountCommand => PositionSet
}