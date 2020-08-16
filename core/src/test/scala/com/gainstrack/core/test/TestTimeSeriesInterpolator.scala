package com.gainstrack.core.test

import com.gainstrack.core._
import com.gainstrack.report.{FXProxy, SingleFXConversion}
import org.scalatest.flatspec.AnyFlatSpec

import scala.collection.immutable.SortedMap

class TestTimeSeriesInterpolator extends AnyFlatSpec {
  val data = SortedColumnMap.from(SortedMap(
    parseDate("2019-01-01") -> parseNumber("1"),
    parseDate("2019-12-31") -> parseNumber("365")
  ))
  val interp = new TimeSeriesInterpolator

  {
    // implicit val linear = TimeSeriesInterpolator.linearFraction
    "TimeSeriesTest" should "extrapolate before start" in {
      assert(interp.interpValueFraction(data, parseDate("2018-01-01")) == Some(1))
    }
    it should "extrapolate after end" in {
      assert(interp.interpValueFraction(data, parseDate("2020-01-01")) == Some(365))
    }
    it should "return exact values" in {
      assert(interp.interpValueFraction(data, parseDate("2019-01-01")) == Some(1))
      assert(interp.interpValueFraction(data, parseDate("2019-12-31")) == Some(365))
    }
    it should "linearly interpolate in between" in  {
      assert(interp.interpValueFraction(data, parseDate("2019-01-02")) == Some(2))
      assert(interp.interpValueFraction(data, parseDate("2019-12-30")) == Some(364))
    }
  }

  {
    implicit val step = TimeSeriesInterpolator.step
    it should "get zero before start" in {
      assert(interp.getValue(data, parseDate("2018-01-01")) == Some(0))
    }
    it should "get max after end" in {
      assert(interp.getValue(data, parseDate("2020-01-01")) == Some(365))
    }
    it should "get exact values" in {
      assert(interp.getValue(data, parseDate("2019-01-01")) == Some(1))
      assert(interp.getValue(data, parseDate("2019-12-31")) == Some(365))
    }
    it should "get flat in between" in  {
      assert(interp.getValue(data, parseDate("2019-01-02")) == Some(1))
      assert(interp.getValue(data, parseDate("2019-12-30")) == Some(1))
    }
  }

  {
    val mktDts = IndexedSeq("2019-06-15", "2019-06-16", "2019-06-17", "2019-06-18").map(parseDate)
    val mktVals = IndexedSeq(100.0,95.0,100.0,105.0)
    val mkt = SingleFXConversion(Map(AssetId("MKT")->SortedColumnMap(mktDts, mktVals)), AssetId("USD") )

    val trdDts = IndexedSeq("2019-06-15", "2019-06-17").map(parseDate)
    val trdVals = IndexedSeq(1000.0, 1000.0)
    val trd = SingleFXConversion(Map(AssetId("TRD")->SortedColumnMap(trdDts, trdVals)), AssetId("USD") )

    val proxyMap = Map(AssetId("TRD") -> AssetId("MKT"))

    val fxProxy = new FXProxy(proxyMap, trd, mkt)

    "FX Proxy" should "return exacts" in {
      assert (fxProxy.getFX(AssetId("TRD"), AssetId("USD"), trdDts(0)) == Some(trdVals(0)) )
      assert (fxProxy.getFX(AssetId("TRD"), AssetId("USD"), trdDts(1)) == Some(trdVals(1)) )
    }

    it should "flat line on low side" in {
      assert (fxProxy.getFX(AssetId("TRD"), AssetId("USD"), trdDts(0).minusDays(10)) == Some(trdVals(0)) )
    }

    it should "follow market on high side" in {
      assert (fxProxy.getFX(AssetId("TRD"), AssetId("USD"), mktDts.last) == Some(1050) )
    }

    it should "linear interpolate in the middle" in {
      assert (fxProxy.getFX(AssetId("TRD"), AssetId("USD"), mktDts(1)) == Some(1000) )
    }

    ignore should "follow the market in the middle" in {
      assert (fxProxy.getFX(AssetId("TRD"), AssetId("USD"), mktDts(1)) == Some(950) )
    }

  }

}
