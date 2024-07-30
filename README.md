# Undexer

This is the Undexer. It decodes historical data from a [Namada](https://namada.net/)
node, and caches it into PostgreSQL, so that you don't have to.

Undexer is the pilot project for [Fadroma 2.0](https://github.com/hackbg/fadroma/).
See [`@fadroma/namada`](https://github.com/hackbg/fadroma/tree/v2/packages/namada)
and [`@hackbg/borshest`](https://github.com/hackbg/toolbox/tree/main/borshest).

## API reference and endpoints

### API v2 (current):  https://undexer.demo.hack.bg/v2/

For all endpoints available please refer to the [OpenAPI specs](swagger.yaml).

### API v1 (deprecated): https://namada.undexer.demo.hack.bg/

## Running locally (without Docker)

Requires:

* Git
* Node.js (tested with 22.3.0)
* PNPM (tested with 9.4.0)
* Rust (tested with 1.79.0)
* wasm-pack (tested with 0.12.1)

Setup:

```sh
git clone --recursive https://github.com/hackbg/undexer
cd undexer
pnpm i
pnpm build:wasm:dev # or pnpm build:wasm:prod
pnpm start # run api and indexer
```

* By default, the API server will listen on `http://localhost:8888`.
  You can set `SERVER_PORT` to listen on another port.

* You can create a `.env` file to provide configuration.

## Running locally (with Docker)

Requires:

* Git
* Node.js (tested with 22.3.0)
* PNPM (**optional but recommended**; tested with 9.4.0)
* Rust (tested with 1.79.0)
* wasm-pack (tested with 0.12.1)
* Docker (tested with 24.0.9)
* Docker Compose (tested with 2.28.1, should come built-in to Docker)
* [Just](https://github.com/casey/just) (**optional but recommended**; tested with 1.29.1)

Setup:

```sh
git clone --recursive https://github.com/hackbg/undexer
cd undexer
npm run build:wasm:dev
just up # or `docker compose up`, etc.
```

* [ ] **TODO:** Build WASM in container, so that Rust WASM toolchain is not required on host

## Next steps

To just launch PostgreSQL and PGAdmin services in Docker, and
work on indexer/API locally (outside of container):

```bash
docker compose up -d postgres pgadmin
npm start
```

This launches the `api` and `indexer` services using [`concurrently`](https://www.npmjs.com/package/concurrently),
and listens on `http://localhost:8888`.

### Compiling the WASM modules

The indexer service depends the WASM blob provided by `@fadroma/namada`.
It lives in `./fadroma/packages/namada/fadroma_namada_bg.wasm`.
It's a binary artifact, so it's not included in the Git repo.
To generate it:

```bash
cd fadroma/packages/namada && npm run build:wasm:dev
```

`./fadroma` is a Git submodule. Handle accordingly. For example, if the directory is empty,
this usually means you cloned the Undexer repo without submodules. To populate it, use:

```bash
git submodule update --init --recursive
```

### Troubleshooting

If you catch anything breaking, debug accordingly
and/or file an issue/PR in this repository.

### Production deployment

Undexer does not manage TLS certificates or terminate HTTPS.
In production, it's recommended to run behind NGINX with ACME/LetsEncrypt
or your own certificates.
