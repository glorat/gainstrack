package com.gainstrack.report

import com.gainstrack.core.{AssetId, LocalDate}

class FXProxy(mapper:Map[AssetId,AssetId], fxConverter: FXConverter) extends SingleFXConverter {
  override def getFX(fx1: AssetId, fx2: AssetId, date: LocalDate): Option[Double] = {
    val cfx1 = mapper.get(fx1).getOrElse(fx1)
    val cfx2 = mapper.get(fx2).getOrElse(fx2)
    val ret = fxConverter.getFX(cfx1, cfx2, date)
    ret
  }
}

class FXChain(fxConverters: FXConverter*) extends SingleFXConverter {
  override def getFX(fx1: AssetId, fx2: AssetId, date: LocalDate): Option[Double] = {
    val x:Option[Double] = None
    fxConverters.foldLeft(x)( (soFar, next) => {
      soFar.map(Some(_)).getOrElse(next.getFX(fx1, fx2, date))
    })
  }
}