
FROM sbtscala/scala-sbt:eclipse-temurin-17.0.15_6_1.11.3_2.13.16 AS builder

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
