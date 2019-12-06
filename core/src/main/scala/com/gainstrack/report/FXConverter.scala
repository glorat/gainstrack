package com.gainstrack.report

import com.gainstrack.core._

trait FXConverter {
  def getFX(fx1:AssetId, fx2:AssetId, date:LocalDate, maxDenom:Long = 1000000):Option[Fraction]
}
