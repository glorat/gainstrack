package com.gainstrack.quotes.av

import scala.concurrent.ExecutionContext

case class QuoteExchange(symbol: String)

case class QuoteConfig(avSymbol:String, actualCcy:String, domainCcy:String, assetType:String) {

  def ticker: String = {
    avSymbol.split('.')(0)
  }

  def exchange:QuoteExchange = {
    val bits = avSymbol.split('.')
    if (bits.length == 1) {
      // TODO: For FX, have a generic FX exchange
      QuoteExchange("NYSE")
    } else {
      QuoteExchange(bits(1))
    }
  }

  def toQuoteSource: QuoteSource = {
    val marketRegion = if (assetType == "FX") "GLOBAL" else exchange.symbol
    QuoteSource(avSymbol, name = avSymbol, ticker= ticker, marketRegion = marketRegion, ccy = actualCcy, sources = Seq(QuoteSourceSource("av", avSymbol, domainCcy)))
  }
}

object QuoteConfig {
  def create(avSymbol: String, actualCcy: String, domainCcy: String): QuoteConfig = {
    QuoteConfig(avSymbol, actualCcy, domainCcy, "Stock")
  }
}
class QuoteConfigDB(implicit ec: ExecutionContext) {
  val allConfigsHardcoded:Seq[QuoteSource] = Seq(
    Tuple3("VWRD.LON", "USD", "LSEUSD"),
    Tuple3("VDEV.LON", "USD", "LSEUSD"),
    Tuple3("VDEM.LON", "USD", "LSEUSD"),
    Tuple3("VFEA.LON", "USD", "LSEUSD"),
    Tuple3("VHVE.LON", "USD", "LSEUSD"),
    Tuple3("VWCG.LON", "USD", "LSEUSD"),
    Tuple3("VAPU.LON", "USD", "LSEUSD"),
    Tuple3("VJPA.LON", "USD", "LSEUSD"),
    Tuple3("IBTA.LON", "USD", "LSEUSD"),
    Tuple3("AGGG.LON", "USD", "LSEUSD"),
    Tuple3("VUSD.LON", "USD", "LSEUSD"),
    Tuple3("AGBP.LON", "GBP", "LSEGBP"),
    Tuple3("TIP5.LON", "USD", "LSEUSD"),
    Tuple3("VWRL.LON", "GBP", "LSEGBP"),
    Tuple3("VMID.LON", "GBP", "LSEGBP"),
    Tuple3("SLXX.LON", "GBP", "LSEGBP"),
    Tuple3("VUKE.LON", "GBP", "LSEGBP"),
    Tuple3("ES3.SGP", "SGD", "SGD"),
    Tuple3("STAN.LON", "GBP", "GBX"),
    Tuple3("2888.HKG", "HKD", "HKD"),
    Tuple3("2823.HKG", "HKD", "HKD"),
    Tuple3("BRK-B", "USD", "USD"),
    Tuple3("VTI", "USD", "USD"),
    Tuple3("VT", "USD", "USD"),
    Tuple3("FLCA", "USD", "USD"),
    Tuple3("XIU.TRT", "CAD", "CAD"),
    Tuple3("GOOG", "USD", "USD"),
    Tuple3("DAX", "USD", "USD")
  ).map((QuoteConfig.create _).tupled).map(_.toQuoteSource)

  val allConfigs = QuoteSource.getAllQuoteSources()

  // A shortcut implementation for now. One day, let's get a list of ISOs
  def allCcys = Seq("GBP", "EUR", "HKD", "CAD", "AUD", "NZD", "CNY", "SGD", "JPY", "SEK", "XAU")

  val allConfigsWithCcy = allConfigs ++ allCcys.map(ccy => QuoteConfig(ccy, ccy, ccy, "FX").toQuoteSource)
}