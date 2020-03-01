package com.gainstrack.core

import com.gainstrack.report.SingleFXConverter


case class Transaction (
                         /** Business time */
                         postDate: LocalDate,
                         description: String,
                         postings: Seq[Posting],
                         origin:AccountCommand,
                         /** System order */
                         id: Int

                       ) extends BeancountCommand {
  require(postings.length>=2, "A transaction must have at least 2 postings")
  lazy val filledPostings: Seq[Posting] = {
    // Logic allows one post to have no amount
    val idx = postings.indexWhere(p => p.isEmpty)
    val ret = if (idx == -1) {
      postings
    }
    else {
      val firstPost = postings.head
      val weight : Fraction = postings.map(p=>p.weight.number).foldLeft(zeroFraction)((a:Fraction, b:Fraction)=>a+b)
      val newPost = postings(idx).copy(value = Some(Amount(-weight, firstPost.weight.ccy)))
      postings.updated(idx,newPost)
    }
    require(!ret.exists(p => p.isEmpty), "No more than one posting can be empty")
    ret
  }

  lazy val isBalanced : Boolean = {
    val filled = filledPostings
    val ccy = filled.head.weight.ccy
    filled.forall(p => p.weight.ccy == ccy) &&
      filled.map(_.weight.number).foldLeft(zeroFraction)((a:Fraction, b:Fraction)=>a+b) == 0
  }

  def balanceChange(accountId:AccountId) : Fraction = {
    filledPostings.filter(_.account == accountId).foldLeft(zeroFraction)((sum,p)=>sum+p.weight.number)
  }

  def subBalanceChange(accountId:AccountId) : Fraction = {
    filledPostings.filter(a => a.account.isSubAccountOf(accountId)).foldLeft(zeroFraction)((sum,p)=>sum+p.weight.number)
  }

  def toBeancount: Seq[BeancountLine] = {
    val header = s"""${postDate.toString} * "${description}""""
    val postings = filledPostings.map(p => s"  ${p}")
    BeancountLines(header +: postings, origin)
  }

  def withId(newId:Int):Transaction = {
    this.copy(id=newId)
  }

/*  def networthChange(singleFXConverter: SingleFXConverter, baseCcy:AssetId): Double = {
    filledPostings.map(p => {
      val amt = p.value.get
      val fx = singleFXConverter.getFX(amt.ccy, baseCcy, this.postDate).getOrElse(0.0)
      val pval = fx * amt.number.toDouble
      val mult = p.account.accountType match {
        case Assets | Liabilities => 1
        case _ => 0
      }
      pval * mult
    }).sum
  }*/

  /** Trades of assets at a discount/premium may balance at a cost-basis but generate immediate m2m pnl */
  def activityPnL(singleFXConverter: SingleFXConverter, toDate:LocalDate, baseCcy:AssetId): Double = {
    val multFn:(AccountType=>Double) = _ match {
      case Assets | Liabilities => 1
      case Income | Expenses | Equity => 1
      case _ => 0
    }

    pnl(singleFXConverter, toDate, baseCcy, multFn)
  }

  def pnl(singleFXConverter: SingleFXConverter, toDate:LocalDate, baseCcy:AssetId, multFn:AccountType=>Double) = {
    filledPostings.map(p => {
      val amt = p.value.get
      val fx = singleFXConverter.getFX(amt.ccy, baseCcy, toDate).getOrElse(0.0)
      val pval = fx * amt.number.toDouble
      val mult = multFn(p.account.accountType)
      pval * mult
    }).sum
  }

  def pnl2(singleFXConverter: SingleFXConverter, toDate:LocalDate, baseCcy:AssetId, multFn:PartialFunction[AccountType, Double]) = {
    filledPostings.map(p => {
      val amt = p.value.get
      val fx = singleFXConverter.getFX(amt.ccy, baseCcy, toDate).getOrElse(0.0)
      val pval = fx * amt.number.toDouble

      val mult:Double = if (multFn.isDefinedAt(p.account.accountType)) multFn(p.account.accountType) else 0.0
      pval * mult
    }).sum
  }


  override def toString: String = toBeancount.map(_.value).mkString("\n")
}

object Transaction {
  def apply(postDate:LocalDate, description:String, postings:Seq[Posting], origin:AccountCommand) : Transaction = {
    apply(postDate, description, postings, origin, 0)
  }
  def apply(postDateStr:String, description:String, postings:Seq[Posting], origin:AccountCommand) : Transaction = {
    apply(parseDate(postDateStr), description, postings, origin, 0)
  }
}
