package com.gainstrack.core


case class Transaction (
                         /** Business time */
                         postDate: LocalDate,
                         description: String,
                         postings: Seq[Posting],
                         /** System time */
                         enterDate: ZonedDateTime

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
      val weight : Fraction = postings.map(p=>p.weight.value).foldLeft(zeroFraction)((a:Fraction,b:Fraction)=>a+b)
      val newPost = postings(idx).copy(value = Some(Balance(-weight, firstPost.weight.ccy)))
      postings.updated(idx,newPost)
    }
    require(!ret.exists(p => p.isEmpty), "No more than one posting can be empty")
    ret
  }

  lazy val isBalanced : Boolean = {
    val filled = filledPostings
    val ccy = filled.head.weight.ccy
    filled.forall(p => p.weight.ccy == ccy) &&
      filled.map(_.weight.value).foldLeft(zeroFraction)((a:Fraction,b:Fraction)=>a+b) == 0
  }

  def toBeancount: String = {
    val sb = new StringBuilder
    sb.append(postDate.toString).append(" * \"").append(description).append("\"\n")
    filledPostings.foreach(p => sb.append("  ").append(p).append("\n"))
    sb.toString()
  }

  override def toString: String = toBeancount
}

object Transaction {
  def apply(postDate:LocalDate, description:String, postings:Seq[Posting]) : Transaction = {
    apply(postDate, description, postings, now())
  }
  def apply(postDateStr:String, description:String, postings:Seq[Posting]) : Transaction = {
    apply(parseDate(postDateStr), description, postings, now())
  }
}
