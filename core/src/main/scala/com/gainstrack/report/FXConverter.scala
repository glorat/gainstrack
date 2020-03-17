package com.gainstrack.report

import com.gainstrack.core._

trait FXConverter {

  def getFX(fx1:String, fx2:String, date:LocalDate):Option[Double] = getFX(AssetId(fx1), AssetId(fx2), date)

  def getFX(fx1:AssetId, fx2:AssetId, date:LocalDate):Option[Double]

  def latestDate(fx1: AssetId, fx2: AssetId, date: LocalDate): Option[LocalDate]
}
