val ScalatraVersion = "2.7.0"

name := "web"

libraryDependencies ++= Seq(
  "org.scalatra" %% "scalatra" % ScalatraVersion,
  "org.scalatra" %% "scalatra-scalatest" % ScalatraVersion % "test",
  "org.scalatra" %% "scalatra-json" % ScalatraVersion,
  "org.scalatra" %% "scalatra-auth" % ScalatraVersion,
  "ch.qos.logback" % "logback-classic" % "1.2.3" % "runtime",
  "org.eclipse.jetty" % "jetty-webapp" % "9.4.24.v20191120" % "container;compile",
  "org.eclipse.jetty" % "jetty-proxy" % "9.4.24.v20191120",
  "javax.servlet" % "javax.servlet-api" % "3.1.0" % "provided",
  "com.auth0" % "java-jwt" % "3.8.3",
  "com.auth0" % "jwks-rsa" % "0.9.0"
)

javaOptions ++= Seq(
  "-Xdebug",
  "-Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
)

enablePlugins(ScalatraPlugin)
