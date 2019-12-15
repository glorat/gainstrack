name := "gainstrack-root"

ThisBuild / version := "0.1"

ThisBuild / organization := "com.gainstrack"

ThisBuild / scalaVersion := "2.12.8"

updateOptions := updateOptions.value.withCachedResolution(true)

lazy val myResolvers = Seq(
  Classpaths.typesafeReleases,
  Resolver.sonatypeRepo("releases"),
  Resolver.sonatypeRepo("public"),
  Resolver.bintrayRepo("cakesolutions", "maven")
)

lazy val dependencies = new {
  val dlstoreV = "0.2.0"
  val dlstore = "net.glorat" %% "dlstore" % dlstoreV
}

lazy val dlstore_deps =
  if (dlstoreFile.exists) Seq()
  else Seq(dependencies.dlstore)

lazy val common_deps = Seq(
  "org.scalatest" %% "scalatest" % "3.0.4" % "test",
  "net.cakesolutions" %% "scala-kafka-client-testkit" % "1.0.0" % "test",
  "org.json4s"   %% "json4s-jackson" % "3.5.0"
)

lazy val dlsuite_deps = dlstore_deps ++ common_deps

lazy val localCheck: ((Project, Boolean, String) => Project) =
  (p, useLocal, path) => {
    if (useLocal) (p in file(path))
    else (p in file(".dummy_" + path.replace("/", "_")))
  }


// Use local dlstore if available - otherwise will pick up from ivy
lazy val dlstoreFile = file("dlstore/build.sbt")
lazy val dlstore = localCheck(project, dlstoreFile.exists, "dlstore/dlstore")

lazy val useLocalDlcrypto = file("dlcrypto/build.sbt").exists()

lazy val commonSettings = Seq(
  libraryDependencies ++= dlsuite_deps,
  resolvers ++= myResolvers,
  test in assembly := {}
)

lazy val web = project
  .dependsOn(core % "compile->compile;test->test")
  .dependsOn(quotes)
  .settings(commonSettings: _*)
  .settings(
    mainClass in assembly := Some("JettyLauncher"),
  )

lazy val core = project
  .dependsOn(dlstore)
  .settings(commonSettings: _*)

lazy val quotes = project
  .dependsOn(core)
  .settings(commonSettings: _*)

lazy val root = (project in file("."))
  .aggregate(core, web)
