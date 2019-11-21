package controllers

import com.gainstrack.command.GainstrackParser
import com.gainstrack.report.GainstrackGenerator
import org.scalatra.ScalatraServlet

import scala.concurrent.ExecutionContext

class ExportController (implicit val ec :ExecutionContext) extends ScalatraServlet {
  val bgDefault = {
    val parser = new GainstrackParser
    val realFile = "real"
    parser.parseFile(s"/Users/kevin/dev/gainstrack/data/${realFile}.gainstrack")
    val orderedCmds = parser.getCommands
    GainstrackGenerator(orderedCmds)
  }

  get("/gainstrack") {
    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    val source = bg.toGainstrack

    contentType = "application/text"
    response.setHeader("Content-Disposition", f"""attachment; filename="mydata.gainstrack"""") // <-- use this if you want to trigger a download prompt in most browsers
    source
  }

  get("/beancount") {
    val bg = session.get("gainstrack").getOrElse(bgDefault).asInstanceOf[GainstrackGenerator]
    val source = bg.toBeancount.map(_.value).mkString("\n")

    contentType = "application/text"
    response.setHeader("Content-Disposition", f"""attachment; filename="mydata.beancount"""") // <-- use this if you want to trigger a download prompt in most browsers
    source
  }
}
