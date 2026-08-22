# Gainstrack

Gainstrack is a plain-text double-entry accounting engine for personal finance and investments. You
write financial events in a small domain-specific language, and it produces portfolio reports and
the primary financial statements from them.

To install the CLI or the agent skill, see [INSTALL.md](INSTALL.md). To use the web app, go to
[www.gainstrack.com](https://www.gainstrack.com), and for user help start at
[Gainstrack Help](https://www.gainstrack.com/help). The rest of this file is for developers working
on the engine itself.

## What is in the repository

| path | what it is |
|---|---|
| [client/](client/) | Vue 3 / Quasar SPA in TypeScript. The application, and the engine it runs on |
| [client/functions/](client/functions/) | Firebase Cloud Functions for quote sources |
| [tools/gainstrack-cli/](tools/gainstrack-cli/) | headless CLI over the same engine, published to npm as `gainstrack` |
| [tools/beancount-oracle/](tools/beancount-oracle/) | a command-line beancount importer, and the test that verifies the conversion against beancount itself |
| [bean2gain/](bean2gain/) | beancount compiled to WebAssembly. GPL-2.0-only and deliberately kept apart (see Licensing) |
| [plugins/](plugins/) | Claude Code agent skills, published from this repo as a plugin marketplace |
| [web/](web/) | Scala HTTP server. Two live endpoints, both serving quotes |
| [quotes/](quotes/) | Scala market data module, backed by Alpha Vantage |
| [core/](core/) | Scala domain model, superseded by the TypeScript port and kept as the parity-test oracle |
| [python/](python/) | Python quote-source helpers, including the `investpy` cloud function |
| [docs/](docs/) | design notes and post-mortems |

`client/`, `client/functions/`, `bean2gain/`, `tools/gainstrack-cli/` and `tools/beancount-oracle/`
are separate packages with their own lockfiles. Run `pnpm install` inside each one you touch.

Four directories are auxiliary and predate the current architecture: `electron/` (a desktop shell),
`fava/` (a Dockerfile and one template), `nginx/` (server configs) and `scripts/` (an sbt wrapper).

## How it runs

The application is client-side. Parsing, report generation and persistence all happen in the
browser against Firestore. The Scala backend survives only to serve market quotes, through two
endpoints in `QuotesController`, and both are guarded on the client so that a quotes outage
degrades rather than blocks.

A Firestore failure must surface as a failure. It must never fall back to the legacy Scala-side
stream, which would show stale data and then fork the two stores on the next save.

`client/src/lib/GainstrackParser.ts` turns text into commands, and `client/src/lib/gen/` folds
those commands into `AllState`. Both are ports of the Scala originals in `core/`, verified
byte-identical against them over a real ledger. Nothing the UI needs routes through Scala any more,
so `core/` earns its keep as the oracle for those parity tests.

[CLAUDE.md](CLAUDE.md) carries the architecture in full, file by file.

## Development

The frontend alone is usually enough. The dev server proxies the two quotes endpoints to the
deployed backend, so most work needs nothing else running.

```bash
cd client
pnpm install
pnpm run dev          # quasar dev, on port 8080
```

The backend matters only when you are working on quotes. Open the project in IntelliJ or another
IDE and run `JettyLauncher`, setting the environment variables below as needed by
`application.conf`.

Cloud functions:

```bash
cd client/functions
export DEV=true
export GOOGLE_APPLICATION_CREDENTIALS=<path-to-json>
pnpm run serve
```

## Testing

```bash
cd client
pnpm run test:unit
pnpm run type-check   # vue-tsc. Must pass before a PR is ready
pnpm run lint
```

The other packages carry their own suites, and `client/`'s does not run them:

- `tools/beancount-oracle`: `BEAN_PYTHON=<python-with-beancount> pnpm run test:unit`, which runs a
  real beancount over the import and skips cleanly without that interpreter
- `tools/gainstrack-cli`: `pnpm run test:unit`
- `bean2gain`: `pnpm run test:unit` and `pnpm run verify:fixtures`
- Scala: `sbt test` from the repository root

The TypeScript port is verified against Scala by golden files, which is the reason `core/` still
compiles. [CLAUDE.md](CLAUDE.md) lists every layer of that suite and the commands that dump the
goldens. It also covers the conventions for private test data, which matter because a fresh clone
has to stay green.

## Environment variables

| variable | purpose |
|---|---|
| `AV_API_KEY` | Alpha Vantage key for market quotes. Free keys come from their website |
| `MYSQL_PASS` | password for the quotes database |
| `MYSQL_HOST` | host for the quotes database (default `127.0.0.1`) |
| `MYSQL_URL` | optional custom JDBC connect string, in place of the host above |
| `GOOGLE_APPLICATION_CREDENTIALS` | path to the Firestore service account JSON. Supplied automatically in Google environments |
| `QUOTES_ADMIN` | enable the quotes admin web API |
| `PORT` | override the Jetty listen port (default 9050) |

Two `MYSQL_URL` examples, and the region needs care:

- `jdbc:mysql:///cloudsql/gainstrack:asia-east2:gainstrack-hk`
- `jdbc:mysql://google/quotes?cloudSqlInstance=gainstrack:asia-east2:gainstrack-hk&socketFactory=com.google.cloud.sql.mysql.SocketFactory`

To proxy a Cloud SQL instance in Google Cloud as localhost:

```bash
cloud-sql-proxy -c ./gainstrack-firebase-adminsdk-some-id.json gainstrack:asia-northeast1:gainstrack-tk
```

## Build

Front end:

```bash
cd client
quasar build
```

A full backend app server image builds and submits with
`gcloud builds submit --config cloudbuild.yaml`, which also updates the latest image in the
container registry.

A newer build system creates base images to speed up the final one. Regenerate the base images when
dependencies change:

```bash
gcloud builds submit --config nodebase.cloudbuild.yaml
gcloud builds submit --config scalabase.cloudbuild.yaml
gcloud builds submit --config runtime.cloudbuild.yaml
```

After that the incremental image builds on a faster CPU, and updates the latest image in the
registry:

```bash
gcloud builds submit --machine-type=N1_HIGHCPU_8 --config fast.cloudbuild.yaml
```

## Deployment

App server:

```bash
gcloud run deploy appserver \
          --region asia-northeast1 \
          --image gcr.io/gainstrack/gainstrack \
          --platform managed \
          --allow-unauthenticated \
          --project gainstrack && \
gcloud run services update-traffic appserver --platform managed --region asia-northeast1 --to-latest
```

TODO: after deployment the FX cache in the server needs priming, or the first wave of calls times
out with a 429.

Quotes server:

```bash
gcloud run deploy quotes \
          --region asia-northeast1 \
          --image gcr.io/gainstrack/gainstrack \
          --platform managed \
          --allow-unauthenticated \
          --project gainstrack
```

Front end, to the backup site and then to production:

```bash
cd client
quasar build && firebase deploy --only hosting:poc
firebase deploy --only hosting:prod
```

Functions:

```bash
cd client/functions
firebase deploy --only functions
```

The `investpy` function is not yet on that path:

```bash
gcloud functions deploy investpy --runtime python38 --trigger-http --allow-unauthenticated --region=asia-northeast1
```

Test it with
https://asia-northeast1-gainstrack.cloudfunctions.net/investpy?ticker=VWRD&marketRegion=LN

## Agent skills

This repository doubles as a Claude Code plugin marketplace, declared in
`.claude-plugin/marketplace.json`. It currently ships **fs-engagement**
([plugins/fs-engagement/](plugins/fs-engagement/)), a playbook for preparing a company's financial
statements from raw records, using the published `gainstrack` CLI as the accounting engine and
bundling a multi-lens review checklist. [INSTALL.md](INSTALL.md#the-agent-skill) has the two
commands that install it.

## Licensing

Gainstrack is **AGPL-3.0-only** (`LICENSE`), with one deliberate exception:

| path | licence | why |
|---|---|---|
| `bean2gain/` | **GPL-2.0-only** | it imports beancount and ships a wheel of it |

**This section is the authority on the boundary.** Read it before moving code across the line.

Beancount is GPL-2.0-**only**, with no "or later" grant. It cannot be combined with AGPL-3.0 into
one work. GPLv2 §6 forbids imposing further restrictions, AGPLv3 §13's network clause is exactly
such a restriction, and AGPLv3's one-way compatibility grant is with GPL*v3*, which does not help
here.

Everything that touches beancount is therefore quarantined in `bean2gain/`: a pair of Python
scripts for the command line, and around them a standalone website. Run from the CLI it distributes
no beancount at all (the user installs it), so no obligation is triggered. The website ships a wheel
and really does distribute it, which is why it is a separate program rather than a directory of
ours. `tools/beancount-oracle/` consumes only the JSON, and GPL does not reach a program's output,
so that JSON and the `.gainstrack` file it becomes are unencumbered.

Three rules keep the two programs two:

1. **No beancount outside `bean2gain/`.** Not the package, not a wheel, not a Pyodide runtime.
   Nothing else in this repository may import, bundle or serve any part of it.
2. **No gainstrack logic inside `bean2gain/`.** Its scripts emit beancount's own data model
   verbatim and name no consumer. The moment lifting rules or account conventions leak in, the "two
   independent programs" reading weakens and our own logic is arguably GPL'd.
3. **The interface is the JSON schema** (`SCHEMA_VERSION` / `SUPPORTED_SCHEMA`), and in the browser
   it is JSON over `postMessage`. Widen it by adding fields to the document, never by reaching
   across. `client/src/lib/bean2gain/bridge.ts` is an independent implementation of a documented
   protocol and contains nothing from the converter.

The arrangement also asks something of the deployment. bean2gain must stay on its own origin, since
serving it from the application's origin, or bundling its `dist/` into ours, would collapse the
distinction. That is why the client bridge refuses to talk to itself.
