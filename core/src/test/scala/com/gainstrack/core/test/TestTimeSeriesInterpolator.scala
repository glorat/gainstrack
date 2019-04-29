package com.gainstrack.core.test

import com.gainstrack.core._
import org.scalatest.FlatSpec

import scala.collection.SortedMap

class TestTimeSeriesInterpolator extends FlatSpec {
  val data:SortedMap[LocalDate, Fraction] = SortedMap(
    parseDate("2019-01-01") -> parseNumber("1"),
    parseDate("2019-12-31") -> parseNumber("365")
  )
  val interp = TimeSeriesInterpolator.from(data)

  {
    implicit val linear = TimeSeriesInterpolator.linear
    "TimeSeriesTest" should "extrapolate before start" in {
      assert(interp.interpValue(data, parseDate("2018-01-01")) == Some(1))
    }
    it should "extrapolate after end" in {
      assert(interp.interpValue(data, parseDate("2020-01-01")) == Some(365))
    }
    it should "return exact values" in {
      assert(interp.interpValue(data, parseDate("2019-01-01")) == Some(1))
      assert(interp.interpValue(data, parseDate("2019-12-31")) == Some(365))
    }
    it should "linearly interpolate in between" in  {
      assert(interp.interpValue(data, parseDate("2019-01-02")) == Some(2))
      assert(interp.interpValue(data, parseDate("2019-12-30")) == Some(364))
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

}
