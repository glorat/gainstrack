package controllers

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gainstrack.core.GainstrackParser
import org.json4s.{CustomSerializer, Formats}
import org.json4s.JsonAST.JString
import org.scalatra._
import org.scalatra.json.JacksonJsonSupport

import scala.concurrent.ExecutionContext

case class Hello(world:String)

class MainController (implicit val ec :ExecutionContext) extends ScalatraServlet with JacksonJsonSupport {
  protected implicit val jsonFormats: Formats = org.json4s.DefaultFormats + LocalDateSerializer
  before() {
    contentType = formats("json")
  }

  get("/") {
    import scala.io.Source

    val parser = new GainstrackParser
    Source.fromFile("/tmp/real.gainstrack").getLines.foreach(parser.parseLine)

    val cmds = parser.getCommands

    val orderedCmds = cmds.sorted

    orderedCmds.groupBy(cmd => cmd.getClass.getSimpleName)
  }
}

object LocalDateSerializer extends CustomSerializer[LocalDate](format => ({
  case JString(str) => LocalDate.parse(str)
}, {
  case value: LocalDate  => {
    val formatter = DateTimeFormatter.ofPattern("YYYY-MM-dd")
    JString(formatter.format(value))
  }
}
))