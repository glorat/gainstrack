package com.gainstrack.quotes.av

import java.nio.file.{Files, Paths}

object SyncUp {
  val apikey = scala.io.Source.fromFile("db/apikey.txt").getLines().next()

  def main(args: Array[String]): Unit = {

    val forceDownload = false

    def allCcys = QuoteConfig.allCcys
    allCcys.foreach(ccy => {
      val outFile = s"db/$ccy.csv"

      val cmd = s"""wget -O $outFile https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=$ccy&to_symbol=USD&outputsize=full&datatype=csv&apikey=$apikey"""

      goGetIt(outFile, cmd, forceDownload)

    })

    QuoteConfig.allConfigs.foreach(cfg => {
      val symbol = cfg.symbol
      val outFile = s"db/$symbol.csv"
      val cmdDaily = s"""wget -O $outFile https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=$symbol&outputsize=full&datatype=csv&apikey=$apikey"""
      goGetIt(outFile, cmdDaily, forceDownload)
      val outFileIntraday = s"db/intraday.$symbol.csv"
      val cmdIntraday = s"""wget -O $outFileIntraday https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=$symbol&interval=60min&datatype=csv&apikey=$apikey"""
      goGetIt(outFileIntraday, cmdIntraday, forceDownload)
    })
  }

  private def goGetIt(outFile:String, cmd:String, forceDownload:Boolean) = {
    import sys.process._

    val path = Paths.get(outFile)
    val exists = Files.exists(path)
    if (!exists || forceDownload) {
      println(cmd)
      val result = cmd !!
    }
    else {
      println(s"Skipping $outFile")
    }

    val size = java.nio.file.Files.size(path)
    if (size < 1000) {
      scala.io.Source.fromFile(outFile).getLines().foreach(println(_))
      Files.delete(path)
    }
  }
}
