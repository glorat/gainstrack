val ScalatraVersion = "2.8.2"

name := "web"

libraryDependencies ++= Seq(
  "org.scalatra" %% "scalatra" % ScalatraVersion,
  "org.scalatra" %% "scalatra-scalatest" % ScalatraVersion % "test",
  "org.scalatra" %% "scalatra-json" % ScalatraVersion,
  "org.scalatra" %% "scalatra-auth" % ScalatraVersion,
  "ch.qos.logback" % "logback-classic" % "1.2.3" % "runtime",
  "org.eclipse.jetty" % "jetty-webapp" % "9.4.35.v20201120" % "container;compile",
  "org.eclipse.jetty" % "jetty-proxy" % "9.4.35.v20201120",
  "javax.servlet" % "javax.servlet-api" % "3.1.0" % "provided",
  "com.auth0" % "java-jwt" % "4.0.0",
  "com.auth0" % "jwks-rsa" % "0.21.2"
)

javaOptions ++= Seq(
  "-Xdebug",
  "-Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
)

enablePlugins(ScalatraPlugin)
