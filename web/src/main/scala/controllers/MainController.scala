package controllers

import com.gainstrack.core.GainstrackParser
import org.json4s.Formats
import org.scalatra._
import org.scalatra.json.JacksonJsonSupport

import scala.concurrent.ExecutionContext

case class Hello(world:String)

class MainController (implicit val ec :ExecutionContext) extends ScalatraServlet with JacksonJsonSupport {
  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats
  before() {
    contentType = formats("json")
  }

  get("/") {
    import scala.io.Source

    val parser = new GainstrackParser
    Source.fromFile("/tmp/real.gainstrack").getLines.foreach(parser.parseLine)

    val cmds = parser.getCommands

    val orderedCmds = cmds.sorted

    orderedCmds.groupBy(cmd => cmd.getClass.getName)
  }
}
