
FROM sbtscala/scala-sbt:eclipse-temurin-17.0.15_6_1.11.3_2.13.16 AS builder

# Install Python dependencies
RUN apt-get update && apt-get -y install python3 python3-pip python3-dev libxml2-dev libxslt-dev gcc musl-dev g++ && rm -rf /var/lib/apt/lists/*

# Install beancount globally with --break-system-packages flag.
# BUILD-TIME ONLY: this is the base that runs `sbt test`, whose bean-check steps
# need it. No runtime image ships beancount -- the only runtime caller is the
# save path in the controllers that have no client callers.
# 2.x matches the beancount plugins the generator emits.
RUN pip3 install --break-system-packages beancount==2.3.6

WORKDIR /build
# Cache dependencies first
COPY project project
COPY build.sbt .
# COPY core/build.sbt core/build.sbt
COPY web/build.sbt web/build.sbt
RUN sbt update
