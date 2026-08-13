# `client/local/` — tests that must never be committed

Everything in this directory is gitignored except this README. Vitest picks specs up here
automatically (the default `**/*.spec.ts` glob covers it), so a file dropped in runs with
`pnpm run test:unit` and nothing else needs configuring.

Use it for tests whose **content** is private — assertions containing real figures, real account
names, or named individuals. Those cannot live in a tracked file at all, no matter how the data
is loaded, because the numbers are in the source.

Path aliases work as everywhere else (`import { generate } from 'src/lib/gen/GainstrackGenerator'`).
The repo root is two levels up, so private data under `<repo>/data/` is
`resolve(__dirname, '../../data/whatever.gainstrack')`.

## When NOT to use this

If only the *input data* is private and the test code is generic, keep the spec in the normal
tree and gate it on the data being present:

```ts
const ledger = path.join(FIXTURES, 'local', 'glorat.gainstrack');
(fs.existsSync(ledger) ? test : test.skip)('private ledger', () => { /* ... */ });
```

That is what the private-ledger cases in `gainstrackExport`, `beancountExport`,
`exportInvariance`, `beancountOracle` and `localGoldens` do. Keeping them tracked is deliberate:
the code documents how parity is checked and is worth reviewing, it skips cleanly on a fresh
checkout, and moving it here would mean maintaining a private copy of logic that also covers the
public fixtures.

The rule, then:

| What is private | Where it goes |
|---|---|
| The data only | tracked spec + gitignored fixture + `existsSync` guard |
| The assertions themselves | here |

## Gotcha worth knowing

Vitest evaluates `describe` bodies at collection time, so a `readFileSync` there — including via
a helper called from the `describe` body rather than from inside `it` — throws before any test
runs and fails the whole suite, not just that file. Inside this directory that only affects you;
in the tracked tree it breaks CI for everyone. Load inside the test, or guard first.
