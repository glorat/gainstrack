package com.gainstrack.report

import com.gainstrack.core.LocalDate

case class ApexTimeSeriesEntry(x:String, y:Double)

case class ApexSeries(name: String, data: Seq[Any])

case class ApexXAxis(categories: Seq[LocalDate], title: ApexTitle)


case class ApexYAxis(title: ApexTitle)

case class ApexTitle(text: String)

case class ApexOptions(series: Seq[ApexSeries], xaxis: Option[ApexXAxis]=None, yaxis: Option[ApexYAxis]=None)
