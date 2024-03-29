package com.gainstrack.report

case class TimeSeries(name:String, units:Seq[String], dates:Seq[String], values:Seq[String], cvalues:Option[Seq[String]], description: Seq[String])

object TimeSeries {
  def apply(name:String, units:Seq[String], dates:Seq[String], values:Seq[String], cvalues:Option[Seq[String]]) : TimeSeries = {
    TimeSeries(name, units, dates, values, cvalues, dates.map(_ => ""))
  }
}