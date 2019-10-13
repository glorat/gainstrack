FROM node:10-alpine as builder
RUN apk add --update --no-cache \
    python \
    make \
    g++

WORKDIR /build
# Cache dependencies first
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm install

# Then build
COPY . .
RUN npm run build

