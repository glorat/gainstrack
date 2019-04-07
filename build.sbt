name := "gainstrack-root"

version := "0.1"

organization := "com.gainstrack"

scalaVersion in GlobalScope := "2.11.7"

updateOptions := updateOptions.value.withCachedResolution(true)

lazy val myResolvers = Seq(
  Classpaths.typesafeReleases,
  Resolver.sonatypeRepo("snapshots"),
  Resolver.sonatypeRepo("public"),
  Resolver.bintrayRepo("cakesolutions", "maven")
)

lazy val dependencies = new {
  val dlstoreV = "0.1.0"
  val dlstore = "net.glorat" % "dlstore_2.11" % dlstoreV
  val dlcryptoV = "0.2.0"
  val dlcrypto_core = "net.glorat" % "dlcrypto_core_2.11" % dlcryptoV
  val dlcrypto_encode = "net.glorat" % "dlcrypto_encode_2.11" % dlcryptoV
}

lazy val dlcrypto_deps =
  if (useLocalDlcrypto) Seq()
else Seq(dependencies.dlcrypto_core, dependencies.dlcrypto_encode)

lazy val dlstore_deps =
  if (dlstoreFile.exists) Seq()
  else Seq(dependencies.dlstore)

lazy val common_deps = Seq(
  "org.scalatest" %% "scalatest" % "3.0.4" % "test",
  "net.cakesolutions" %% "scala-kafka-client-testkit" % "1.0.0" % "test"
)

lazy val dlsuite_deps = dlstore_deps ++ dlcrypto_deps ++ common_deps

lazy val localCheck: ((Project, Boolean, String) => Project) =
  (p, useLocal, path) => {
    if (useLocal) (p in file(path))
    else (p in file(".dummy_" + path.replace("/", "_")))
  }

// Use local dlstore if available - otherwise will pick up from ivy
lazy val dlstoreFile = file("dlstore/build.sbt")
lazy val dlstore = localCheck(project, dlstoreFile.exists, "dlstore/dlstore")

lazy val useLocalDlcrypto = file("dlcrypto/build.sbt").exists()

lazy val dlcrypto_core = localCheck(project, useLocalDlcrypto, "dlcrypto/dlcrypto_core")
  .settings(fork  := true)

lazy val dlcrypto_encode = localCheck(project, useLocalDlcrypto, "dlcrypto/dlcrypto_encode")
  .dependsOn(dlcrypto_core % "compile->compile;test->test")

lazy val web = project
  .dependsOn(dlcrypto_core % "compile->compile;test->test", core % "compile->compile;test->test")
  .settings(libraryDependencies ++= dlsuite_deps, resolvers ++= myResolvers)

lazy val core = project
  .dependsOn(dlstore)
  .dependsOn(dlcrypto_core % "compile->compile;test->test")
  .settings(libraryDependencies ++= dlsuite_deps, resolvers ++= myResolvers)

lazy val root = (project in file("."))
  .aggregate(core, web)
