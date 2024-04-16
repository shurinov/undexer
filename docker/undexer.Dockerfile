FROM node:21-alpine
WORKDIR /app
RUN apk update && apk add rustup build-base
RUN rustup-init -y -t wasm32-unknown-unknown
RUN ~/.cargo/bin/cargo install wasm-pack
ADD . ./
RUN corepack enable && pnpm i --frozen-lockfile
RUN pnpm buildRust
