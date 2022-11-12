
FROM gcr.io/gainstrack/scalabase as builder
WORKDIR /build
COPY project project
COPY build.sbt .
COPY web web
COPY quotes quotes
COPY core core
RUN sbt assembly

FROM gcr.io/gainstrack/runtime
RUN mkdir -p /app
WORKDIR /app

COPY python python
RUN pip3 install -r python/requirements.txt

COPY ./run_jar.sh ./
COPY --from=builder /build/web/target/scala-2.13/web-assembly-0.1.jar ./
ENTRYPOINT ["./run_jar.sh"]
RUN mkdir -p /app/src/main/webapp
RUN mkdir -p db/userdata
RUN mkdir -p /Users/kevin/dev/gainstrack/data/
COPY core/src/test/resources/src.gainstrack /Users/kevin/dev/gainstrack/data/real.gainstrack
