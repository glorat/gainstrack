package com.gainstrack.quotes.av

case class QuoteConfig(symbol:String, actualCcy:String, domainCcy:String)

object QuoteConfig {
  val allConfigs:Seq[QuoteConfig] = Seq(
    Tuple3("VWRD.LON", "USD", "LSEUSD"),
    Tuple3("VDEV.LON", "USD", "LSEUSD"),
    Tuple3("AGGG.LON", "USD", "LSEUSD"),
    Tuple3("TIP5.LON", "USD", "LSEUSD"),
    Tuple3("VWRL.LON", "GBP", "LSEGBP"),
    Tuple3("VMID.LON", "GBP", "LSEGBP"),
    Tuple3("STAN.LON", "GBP", "GBX"),
    Tuple3("2888.HKG", "HKD", "HKD"),
    Tuple3("GOOG", "USD", "USD"),
  ).map((QuoteConfig.apply _).tupled)

  // A shortcut implementation for now. One day, let's get a list of ISOs
  def allCcys = allConfigs.map(_.actualCcy).distinct.filter(_ != "USD")
}