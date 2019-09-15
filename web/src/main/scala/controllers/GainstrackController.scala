package controllers

import com.gainstrack.command.GainstrackParser
import com.gainstrack.report.GainstrackGenerator
import org.json4s.Formats

trait GainstrackController {
  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats + LocalDateSerializer

  protected val bgDefault = {
    val parser = new GainstrackParser
    val realFile = "real"
    val filename = s"/Users/kevin/dev/gainstrack/data/${realFile}.gainstrack"
    parser.parseFile(filename)
    val orderedCmds = parser.getCommands
    new GainstrackGenerator(orderedCmds)
  }

}
