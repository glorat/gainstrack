package com.gainstrack.report

import com.gainstrack.core._

trait FXConverter {
  def getFX(fx1:AssetId, fx2:AssetId, date:LocalDate):Option[Double]
}
