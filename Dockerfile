FROM hseeberger/scala-sbt:8u181_2.12.8_1.2.8 as builder
# Install fava
RUN apt-get update && apt-get -y install python3 python3-pip python3-dev libxml2-dev libxslt-dev gcc musl-dev g++ && rm -rf /var/lib/apt/lists/*
RUN pip3 install fava

WORKDIR /build
# Cache dependencies first
COPY project project
COPY build.sbt .
COPY core/build.sbt core/build.sbt
COPY web/build.sbt web/build.sbt
RUN sbt update
# Then build
COPY web web
COPY quotes quotes
COPY core core
RUN sbt test assembly

# Sort out the web client
FROM node:10-alpine as webbuilder
RUN apk add --update --no-cache \
    python \
    make \
    g++

# Cache dependencies first
COPY ./client/package.json package.json
COPY ./client/package-lock.json package-lock.json
RUN npm install

# Then build
COPY ./client/ .
RUN npm run build

FROM openjdk:8-jre-alpine
RUN apk add --update python3 python3-dev libxml2-dev libxslt-dev gcc musl-dev g++
RUN pip3 install fava

RUN mkdir -p /app
WORKDIR /app
COPY ./run_jar.sh ./
COPY --from=builder /build/web/target/scala-2.12/web-assembly-0.1.jar ./
ENTRYPOINT ["./run_jar.sh"]
RUN mkdir -p /app/src/main/webapp
#COPY --from=builder ./web/src/main/webapp/ ./src/main/webapp/
COPY --from=webbuilder ./dist/ ./dist/
RUN mkdir -p db/userdata
RUN mkdir -p /Users/kevin/dev/gainstrack/data/
COPY core/src/test/resources/src.gainstrack /Users/kevin/dev/gainstrack/data/real.gainstrack
