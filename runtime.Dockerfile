FROM openjdk:17.0.2-slim-bullseye
RUN apt-get update && apt-get -y install wget python3 python3-pip python3-dev libxml2-dev libxslt-dev gcc musl-dev g++ && rm -rf /var/lib/apt/lists/*
RUN pip3 install fava
RUN mkdir -p /app
WORKDIR /app

COPY python python
RUN pip3 install -r python/requirements.txt
