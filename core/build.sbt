
name := "core"

version := "0.1"

organization := "com.gainstrack"

scalaVersion := "2.11.7"

val ScalatraVersion = "2.5.1"

libraryDependencies ++= Seq(
  "org.typelevel" %% "spire" % "0.14.1",
  "org.scalatest" %% "scalatest" % "3.0.4" % "test",
  "com.thesamet.scalapb" %% "scalapb-runtime" % scalapb.compiler.Version.scalapbVersion,
  "com.thesamet.scalapb" %% "scalapb-runtime" % scalapb.compiler.Version.scalapbVersion % "protobuf",  "org.scalatra" %% "scalatra" % ScalatraVersion,
  "org.scalatra" %% "scalatra-scalatest" % ScalatraVersion % "test",
  "org.scalatra" %% "scalatra-json" % ScalatraVersion,
  "net.cakesolutions" %% "scala-kafka-client-testkit" % "1.0.0" % "test",
  "org.slf4j" % "log4j-over-slf4j" % "1.7.21" % "test"
)

PB.targets in Compile := Seq(
  scalapb.gen() -> (sourceManaged in Compile).value
)
