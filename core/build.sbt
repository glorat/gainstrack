
name := "core"

val ScalatraVersion = "2.6.5"

libraryDependencies ++= Seq(
  "org.typelevel" %% "spire" % "0.14.1",
  "org.scalatest" %% "scalatest" % "3.0.4" % "test",
  "org.scalatra" %% "scalatra-scalatest" % ScalatraVersion % "test",
  "org.scalatra" %% "scalatra-json" % ScalatraVersion,
  "net.cakesolutions" %% "scala-kafka-client-testkit" % "1.0.0" % "test",
  "org.slf4j" % "log4j-over-slf4j" % "1.7.21" % "test"
)
