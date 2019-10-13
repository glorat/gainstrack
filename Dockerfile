FROM hseeberger/scala-sbt:8u181_2.12.8_1.2.8 as builder
WORKDIR /build
# Cache dependencies first
COPY project project
COPY build.sbt .
RUN sbt update
# Then build
COPY . .
RUN sbt assembly

FROM openjdk:8-jre-alpine
RUN mkdir -p /app
WORKDIR /app
COPY ./run_jar.sh ./
COPY --from=builder /build/web/target/scala-2.12/web-assembly-0.1.jar ./
ENTRYPOINT ["./run_jar.sh"]
RUN mkdir -p /app/src/main/webapp
#COPY --from=builder ./web/src/main/webapp/ ./src/main/webapp/
RUN mkdir -p /Users/kevin/dev/gainstrack/data/
COPY core/src/test/resources/src.gainstrack /Users/kevin/dev/gainstrack/data/real.gainstrack
