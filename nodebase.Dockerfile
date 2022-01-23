FROM node:16-alpine
RUN apk add --update --no-cache \
    git \
    python \
    make \
    g++

WORKDIR /build

# Cache dependencies first
COPY ./client/package.json package.json
COPY ./client/package-lock.json package-lock.json
RUN npm install
