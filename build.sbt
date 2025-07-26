name := "gainstrack-root"

ThisBuild / version := "0.1"

ThisBuild / organization := "com.gainstrack"

ThisBuild / scalaVersion := "2.13.16"

updateOptions := updateOptions.value.withCachedResolution(true)

lazy val myResolvers = Seq(
  Classpaths.typesafeReleases,
  Resolver.bintrayRepo("cakesolutions", "maven")
) ++ Resolver.sonatypeOssRepos("releases") ++ Resolver.sonatypeOssRepos("public")


lazy val dependencies = new {
  val dlstoreV = "0.4.0"
  val dlstore = "net.glorat" %% "dlstore" % dlstoreV
}

lazy val dlstore_deps =
  if (dlstoreFile.exists) Seq()
  else Seq(dependencies.dlstore)

lazy val common_deps = Seq(
  "org.typelevel" %% "spire" % "0.18.0",
  "org.scalatest" %% "scalatest" % "3.2.15" % "test",
  "org.json4s"   %% "json4s-core" % "4.0.6",
  "org.json4s"   %% "json4s-jackson" % "4.0.6",
  "com.typesafe.slick" %% "slick" % "3.4.1",
  "com.typesafe.slick" %% "slick-hikaricp" % "3.4.1",
  "mysql" % "mysql-connector-java" % "8.0.33",
  "com.google.cloud.sql" % "mysql-socket-factory-connector-j-8" % "1.11.0",
  "com.google.cloud" % "google-cloud-pubsub" % "1.123.6",
  "com.softwaremill.sttp.client3" %% "core" % "3.8.13",
  "com.softwaremill.sttp.client3" %% "json4s" % "3.8.13",
  "com.softwaremill.sttp.client3" %% "async-http-client-backend-future" % "3.8.13"

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
  assembly / test := {},
  assembly / assemblyMergeStrategy := {
    case x if x.contains("io.netty.versions.properties") => MergeStrategy.discard
    case "module-info.class" => MergeStrategy.discard // Jackson libraries
    case PathList("META-INF", "services", xs @ _*) => MergeStrategy.concat // Netty config
    case PathList("META-INF", xs @ _*) => MergeStrategy.discard
    case x => {
      val oldStrategy = (assembly / assemblyMergeStrategy).value
      oldStrategy(x)
    }

  }
)

lazy val web = project
  .dependsOn(quotes % "compile->compile;test->test")
  .settings(commonSettings: _*)
  .settings(
    assembly / mainClass := Some("JettyLauncher"),
  )

lazy val core = project
  .dependsOn(dlstore)
  .settings(commonSettings: _*)

lazy val quotes = project
  .dependsOn(core % "compile->compile;test->test")
  .settings(commonSettings: _*)

lazy val root = (project in file("."))
  .aggregate(core, web)
