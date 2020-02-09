package com.gainstrack.quotes.av

case class QuoteConfig(avSymbol:String, actualCcy:String, domainCcy:String)

object QuoteConfig {
  val allConfigs:Seq[QuoteConfig] = Seq(
    Tuple3("VWRD.LON", "USD", "LSEUSD"),
    Tuple3("VDEV.LON", "USD", "LSEUSD"),
    Tuple3("VDEM.LON", "USD", "LSEUSD"),
    Tuple3("VFEA.LON", "USD", "LSEUSD"),
    Tuple3("VHVE.LON", "USD", "LSEUSD"),
    Tuple3("IBTA.LON", "USD", "LSEUSD"),
    Tuple3("AGGG.LON", "USD", "LSEUSD"),
    Tuple3("AGBP.LON", "GBP", "LSEGBP"),
    Tuple3("TIP5.LON", "USD", "LSEUSD"),
    Tuple3("VWRL.LON", "GBP", "LSEGBP"),
    Tuple3("VMID.LON", "GBP", "LSEGBP"),
    Tuple3("SLXX.LON", "GBP", "LSEGBP"),
    Tuple3("STAN.LON", "GBP", "GBX"),
    Tuple3("2888.HKG", "HKD", "HKD"),
    Tuple3("2823.HKG", "HKD", "HKD"),
    Tuple3("BRK-B", "USD", "USD"),
    Tuple3("XIU.TRT", "CAD", "CAD"),
    Tuple3("GOOG", "USD", "USD"),
    Tuple3("DAX", "USD", "USD")
  ).map((QuoteConfig.apply _).tupled)

  // A shortcut implementation for now. One day, let's get a list of ISOs
  def allCcys = allConfigs.map(_.actualCcy).distinct.filter(_ != "USD")

}