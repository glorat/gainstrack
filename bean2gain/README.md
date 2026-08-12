# bean2gain

A static website that loads a beancount ledger with beancount's own loader and hands back JSON.
No server, no upload, no Python installation. It has one job.

```
ledger.beancount  ─►  [ CPython 3.13 + beancount 3.2.0, compiled to WASM ]  ─►  ledger.json
                              running python/dump.py, unmodified
```

The output is beancount's data model after the loader has finished with it: includes resolved,
arithmetic evaluated, elided amounts interpolated, plugins run, `pad` expanded, and **booking**
performed — every posting's lot chosen under its account's method. That last part is the reason
this exists. It is the 80% of beancount that is hard, and reimplementing it elsewhere would diverge
silently on the numbers, which is the one failure mode a migration tool cannot have.

## Two ways to use it

**As a website.** Paste a ledger or drop files on it, get JSON back. `pnpm run dev`.

**As a converter for another site.** `/embed.html` in a hidden iframe, driven over a
`MessageChannel`: send ledger text, get the JSON document back. That is how an application can
import a beancount ledger without containing any beancount. [docs/embedding.md](docs/embedding.md)
specifies the protocol and includes a client you can copy.

## Does it give the same answers?

Yes, byte for byte, and this is checked rather than assumed — with `beancount 3.2.0` on both sides:

| ledger | entries | result |
|---|---|---|
| `simple` | 8 | identical |
| `booking` — STRICT/FIFO/AVERAGE lot selection | 11 | identical |
| `kitchen-sink` — every directive type, an include, `pad`, tolerated and untolerated residues, a failing assertion | 26 | identical |
| `bean-example` output | 2037 | identical |

Identical down to the digits — resolved lot costs, interpolated amounts, inferred tolerances and
the text of loader errors — because every number in the schema is a string, so the comparison can
be exact rather than approximate.

Two things differ and did not matter: the interpreter (3.13.14 native, 3.13.2 wasm) and beancount's
dependencies (`click` 8.4.2 vs 8.3.1, `regex` 2026.7.19 vs 2024.11.6 — Pyodide ships its own
distribution). `verify/compare.ts` prints both sets, so a future divergence can be attributed
rather than guessed at.

Speed is a non-issue: 2037 entries dump in ~220 ms against ~230 ms native. The cost is the ~2 s to
start the interpreter, paid once.

## Layout

| | |
|---|---|
| `python/dump.py` | ledger → versioned JSON of post-booking entries. The one script all of this is about |
| `python/balances.py` | ledger → per-(account, currency) totals. The oracle half of the import's verification |
| `src/beancount.ts` | the browser runtime: Pyodide, the wheel, and `dump.py` |
| `src/dumpProgram.ts` | the Python driver, shared with `verify/` — one dump path, three hosts |
| `src/bridge.ts`, `src/protocol.ts` | the embedded conversation and its wire contract |
| `src/main.ts`, `index.html` | the standalone site |
| `src/embed.ts`, `embed.html` | the headless endpoint |
| `scripts/assets.ts` | assembles `public/pyodide/<version>/` — the interpreter and wheels this site serves |
| `public/sw.js` | the offline cache. Version-keyed, so an upgrade can never be served from a stale one |
| `verify/` | the Node harness that compares against native CPython. **Dev only; never shipped** |

`python/dump.py` has exactly one copy. The browser imports it as text (Vite inlines it, so the
deployed site is self-contained), the Node harness reads it off disk, and a CLI user runs it
directly — the same file in all three, which is what makes "the browser gives the same answers" a
structural fact rather than a hope.

## The command line

`dump.py` is an ordinary script and still works as one. You need a Python with beancount; if you
are migrating away from beancount you already have one.

```bash
python3 -m venv .venv && .venv/bin/pip install beancount

.venv/bin/python python/dump.py ledger.beancount > ledger.json
```

What consumes that JSON is not this project's business; "Output shape" below is the whole contract.

The website does the same job without the venv, which is the point of it — but the CLI stays,
because `verify/` needs a native beancount as the oracle that proves the WASM is right. Deprecating
the Python path entirely would leave the wheel with nothing checking it.

`python/balances.py` is not part of the conversion. It reports per-(account, currency) totals and
exists so a downstream importer can verify a round trip against beancount's own loader on both
sides. Such a suite is expected to locate it via `BEAN2GAIN_PYTHON_DIR` and skip when it cannot, so
this project being absent never turns anyone's checkout red.

## Output shape

`dump.py` emits `{schema, source, options, errors, entries}`. **Numbers are strings** throughout:
beancount computes in `decimal.Decimal`, and a lot cost that has been through a JSON float no
longer balances against the cash leg it came from. `SCHEMA_VERSION` here and `SUPPORTED_SCHEMA` in
the consumer move together — the reader refuses a document it does not understand rather than
reading absent fields as "the user had none of those". After this project is extracted, that pair
becomes a cross-repository contract, and the version number is the only thing keeping it honest.

## Commands

```bash
pnpm install
pnpm run dev            # assembles public/pyodide/<version>/ if needed, then serves
pnpm run build          # → dist/, about 13 MB, mostly interpreter
pnpm run preview

pnpm run test:unit      # assembles assets, then: service worker, bridge protocol, browser module,
                        # and both comparisons against native beancount
pnpm run type-check

pnpm run verify:fixtures        # the differential harness, human-readable
pnpm run verify:example         # generate a 2000-entry corpus with bean-example under WASM
pnpm run verify:dump l.bean     # dump.py under Node-Pyodide, no browser involved
```

The comparison against native beancount needs a Python that has it. It looks for `$BEAN_PYTHON`,
then `.venv/bin/python` here, then `/usr/bin/python3` — never above this directory:

```bash
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python beancount==3.2.0
```

Without one, the specs still run everything that does not need an oracle and skip the rest with a
note saying why — as does a Python whose beancount is a *different* version.

The *browser* specs are not allowed to skip that quietly. They are the only thing standing behind
the claim that the shipped path matches native beancount, so a run without them fails rather than
reporting a thinner green; `BEAN2GAIN_SKIP_BROWSER=1` says you meant it. `.github/workflows/ci.yml`
provisions the venv and the assets so neither opt-out is ever taken in CI. GitHub only reads
workflows from a repository root, so that file is inert until this project is extracted — which is
the point of it being here.

## Deploying

Static files, any host. `firebase.json` and `.firebaserc` point at the `bean2gain` site of the
`gainstrack` project — currently **https://bean2gain.web.app**, with `bean2gain.gainstrack.com` to
be pointed at it once DNS is set up.

```bash
pnpm run deploy                            # build, then firebase deploy --only hosting
firebase deploy --only hosting --dry-run   # validate the config without publishing
```

Because `vite.config.ts` sets `base: './'`, every asset is referenced relatively — the same `dist/`
works at `web.app`, at a custom domain, and in a subdirectory. Adding the custom domain needs no
rebuild.

**The interpreter is served from `pyodide/<version>/`, and that is load-bearing.** Its files —
`pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide-lock.json` — carry no version in their own names,
so a flat layout would have an upgrade rewrite the same URLs. The service worker caches the runtime
first and never revalidates it, which is what makes a second visit fast; on unversioned URLs that
same behaviour would pin a returning visitor to the old interpreter forever, under a new bundle
that was never tested against it. Versioning the path makes those URLs content-addressed, so the
cache is unconditionally safe and `firebase.json` can mark them immutable. `pyodide/manifest.json`
is the one URL that must stay fresh: it names the current directory, and both the app and the
worker read it. `serviceWorker.spec.ts` runs the shipped worker through an upgrade to hold this in
place.

The one thing the deployment, not the code, has to get right: **it must be a different origin from
whatever embeds it.** The client bridge refuses to run same-origin — it would work, and it would
also quietly dissolve the separation this arrangement exists for.

`frame-ancestors` on `/embed.html` names the origins allowed to *drive* the converter. It is
listed for cost and blast radius rather than for safety — the page holds nothing worth stealing —
and it includes `http://localhost:8080` so the app's dev server can talk to the deployed converter.
Widening it is a one-line redeploy. `VITE_EMBED_ORIGINS` produces a nicer refusal in the frame's
status line, but the header is what a browser enforces.

## Sharp edges

- **`pyodide` is pinned exactly.** The wheels are `cp313` / `emscripten_4_0_9`; pyodide `0.29.3` is
  the last release on Python 3.13 (the next line is versioned `314.x` and ships 3.14, into which
  these wheels will not install). Upgrading means waiting for rebuilt wheels.
- **The wheel is beancount 3.2.0**, one patch behind a fresh `pip install`. It moves when
  [`beancount-wasm`](https://github.com/fengkx/beancount-wasm) rebuilds, not when upstream releases.
- **`pnpm run assets` needs the network once.** The interpreter is in the npm package; beancount's
  dependencies belong to Pyodide's own distribution and are fetched from the pinned CDN and cached
  in `public/pyodide/`. Every later build is offline.
- **The specs do not fetch assets over HTTP.** Pyodide under Node resolves `indexURL` with
  `path.join`, which mangles a URL, so pointing it at a server requires being a browser. They load
  the assembled directory instead — which catches a missing wheel, but not a serving problem. That
  one is checked by hand with `pnpm run dev`.

## Licence

GPL-2.0-only (`LICENSE`), because this contains beancount, which is GPLv2 with no "or later" grant.

Two consequences are worth stating plainly, because they are what make the converter useful to
callers who are not GPL:

- **The JSON is not covered.** GPL does not reach a program's output. What you do with a dump, and
  with whatever you turn it into, is yours.
- **Nothing here should be specific to one caller.** `dump.py` and `balances.py` emit beancount's
  own data model verbatim and name no consumer; anyone converting beancount to anything at all can
  use them unmodified. Keep it that way. A caller that needs its own vocabulary builds it on the
  JSON, on its own side.
