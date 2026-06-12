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
