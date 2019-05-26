FROM openjdk:8-jre-alpine
RUN mkdir -p /opt/app
WORKDIR /opt/app
COPY ./run_jar.sh ./web/target/scala-2.12/web-assembly-0.1.jar ./
ENTRYPOINT ["./run_jar.sh"]
RUN mkdir -p /opt/app/src/main/webapp
COPY ./web/src/main/webapp/ ./src/main/webapp/
RUN mkdir -p /Users/kevin/dev/gainstrack/data/
COPY ./data/real.gainstrack /Users/kevin/dev/gainstrack/data/real.gainstrack