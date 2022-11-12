FROM gcr.io/gainstrack/scalabase as builder
WORKDIR /build
COPY project project
COPY build.sbt .
COPY web web
COPY quotes quotes
COPY core core
RUN sbt test assembly
