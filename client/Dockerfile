FROM node:24-alpine as builder
RUN apk add --update --no-cache \
    python3 \
    make \
    g++

WORKDIR /build
# Cache dependencies first
COPY package.json package.json
COPY pnpm-lock.yaml pnpm-lock.yaml
RUN corepack enable && pnpm install --frozen-lockfile

# Then build
COPY . .
RUN pnpm build
