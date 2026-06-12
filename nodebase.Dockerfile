FROM node:24-alpine
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
