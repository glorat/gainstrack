FROM sbtscala/scala-sbt:eclipse-temurin-17.0.15_6_1.11.3_2.13.16 AS builder
# Install beancount for the bean-check step exercised by `sbt test` below.
RUN apt-get update && apt-get -y install python3 python3-pip python3-dev libxml2-dev libxslt-dev gcc musl-dev g++ && rm -rf /var/lib/apt/lists/*
# Pinned to the validated version; --break-system-packages because this base is
# PEP-668 externally-managed (same as scalabase.Dockerfile).
RUN pip3 install --break-system-packages beancount==2.3.6

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
FROM node:24-alpine as webbuilder
RUN apk add --update --no-cache \
    git \
    python3 \
    make \
    g++

WORKDIR /build

# Cache dependencies first
COPY ./client/package.json package.json
COPY ./client/pnpm-lock.yaml pnpm-lock.yaml
RUN corepack enable && pnpm install --frozen-lockfile

# Then build
COPY ./client/ .
RUN pnpm build

FROM eclipse-temurin:17-jre-jammy
RUN apt-get update && apt-get -y install wget python3 python3-pip python3-dev libxml2-dev libxslt-dev gcc musl-dev g++ && rm -rf /var/lib/apt/lists/*
# Pin beancount alongside fava so the runtime bean-check uses the validated 2.3.6
# (fava 1.30.x is compatible with beancount 2.3.6). python/requirements.txt below
# reaffirms the same pin.
RUN pip3 install fava beancount==2.3.6
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
