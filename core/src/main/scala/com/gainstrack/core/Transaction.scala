package com.gainstrack.core


case class Transaction (
                         /** Business time */
                         postDate: LocalDate,
                         description: String,
                         postings: Seq[Posting],
                         /** System time */
                         enterDate: ZonedDateTime,
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

  override def toString: String = toBeancount.map(_.value).mkString("\n")
}

object Transaction {
  def apply(postDate:LocalDate, description:String, postings:Seq[Posting], origin:AccountCommand) : Transaction = {
    apply(postDate, description, postings, now(), origin, 0)
  }
  def apply(postDateStr:String, description:String, postings:Seq[Posting], origin:AccountCommand) : Transaction = {
    apply(parseDate(postDateStr), description, postings, now(), origin, 0)
  }
}
