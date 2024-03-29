FROM hseeberger/scala-sbt:17.0.2_1.6.2_2.13.8 as builder
# Install fava
RUN apt-get update && apt-get -y install python3 python3-pip python3-dev libxml2-dev libxslt-dev gcc musl-dev g++ && rm -rf /var/lib/apt/lists/*
RUN pip3 install beancount

WORKDIR /build
# Cache dependencies first
COPY project project
COPY build.sbt .
# COPY core/build.sbt core/build.sbt
COPY web/build.sbt web/build.sbt
RUN sbt update
# Then build
COPY web web
COPY quotes quotes
COPY core core
RUN sbt test assembly

# Sort out the web client
FROM node:16-alpine as webbuilder
RUN apk add --update --no-cache \
    git \
    python3 \
    make \
    g++

WORKDIR /build

# Cache dependencies first
COPY ./client/package.json package.json
COPY ./client/package-lock.json package-lock.json
RUN npm install

# Then build
COPY ./client/ .
RUN npm run build

FROM openjdk:17.0.2-slim-bullseye
RUN apt-get update && apt-get -y install wget python3 python3-pip python3-dev libxml2-dev libxslt-dev gcc musl-dev g++ && rm -rf /var/lib/apt/lists/*
RUN pip3 install fava
RUN mkdir -p /app
WORKDIR /app

COPY python python
RUN pip3 install -r python/requirements.txt

COPY ./run_jar.sh ./
COPY --from=builder /build/web/target/scala-2.13/web-assembly-0.1.jar ./
ENTRYPOINT ["./run_jar.sh"]
RUN mkdir -p /app/src/main/webapp
#COPY --from=builder ./web/src/main/webapp/ ./src/main/webapp/
COPY --from=webbuilder /build/dist/spa/ ./dist/
RUN mkdir -p db/userdata
RUN mkdir -p /Users/kevin/dev/gainstrack/data/
COPY core/src/test/resources/src.gainstrack /Users/kevin/dev/gainstrack/data/real.gainstrack
