# Releasing

One version number per release, computed once, stamped everywhere. Nobody types a version by hand.

## What triggers a release

A push to `master`. [`.github/workflows/quasar_deploy.yml`](../.github/workflows/quasar_deploy.yml)
runs semantic-release over the commits since the last tag and decides:

| Commit type | Bump |
|---|---|
| `feat:` | minor |
| `fix:`, `perf:`, `refactor:`, `revert:` | patch |
| anything with `BREAKING CHANGE:` in the body | major |
| `docs:`, `chore:`, `ci:`, `test:`, `style:`, `build:` | **no release** |

`refactor:` is a patch by local rule. The default preset ignores it, which once left a
behaviour-changing commit sitting on `master` unreleased and undeployed. So if a commit changes
what the app does, it must not be typed `chore:` or `docs:`.

If no commit warrants a release, the workflow tests and stops. Nothing deploys.

## What one release produces

Everything below carries the same version:

- **git tag** `vX.Y.Z` and a **GitHub release**, notes generated from the commit subjects
- **`CHANGELOG.md`** and the version fields of `client/package.json` and
  `tools/gainstrack-cli/package.json`, committed back to `master` as
  `chore(release): X.Y.Z [skip ci]`, which is what makes a checkout know its own version
- **www.gainstrack.com and poc.gainstrack.com**, from one build artifact
- **`gainstrack` on npm** (the CLI), published by OIDC trusted publishing
- **`gcr.io/gainstrack/gainstrack:X.Y.Z`**, also pushed as `:latest`, deployed to the `appserver`
  and `quotes` Cloud Run services
- a **Sentry release** `gainstrack@X.Y.Z` with source maps

The version is computed once in the `pre_check` job, and every other job reads
`needs.pre_check.outputs.new_release_version`. The `release` job re-runs semantic-release to
execute the release, then asserts its version matches what `pre_check` planned, so the two cannot
silently disagree. Keep `semantic_version` and `extra_plugins` identical between those two steps:
a difference there is a difference in the version.

## Release notes: two of them, on purpose

`CHANGELOG.md` and the GitHub release are generated from commit subjects, for developers. Never
edit either by hand, since semantic-release owns both.

[`client/public/md/releases.md`](../client/public/md/releases.md) is the curated account for users,
served at `/docs/releases`. CI fails a minor or major release whose top heading is not `### vX.Y.0`
for the version being released. Patch releases need no notes.

So for a feature release, write the `### vX.Y.0` section before merging the last `feat:` commit.
You need the number in advance: it is the current tag with the minor bumped and the patch zeroed,
unless the batch contains a breaking change.

## Rolling back

The backend image is tagged with its version, so a rollback is a redeploy:

```bash
gcloud run deploy appserver --region asia-northeast1 \
  --image gcr.io/gainstrack/gainstrack:3.16.1 \
  --platform managed --allow-unauthenticated --project gainstrack
```

For the front end, run `firebase hosting:rollback`, or redeploy a previous release from the
Firebase console. For npm, run `npm deprecate gainstrack@X.Y.Z "..."`. Published versions cannot be
unpublished after 72 hours.

## Checking what a push will do, before pushing

```bash
npm install                      # from the repo root, not client/
GITHUB_TOKEN=<a token> npx semantic-release --dry-run --no-ci
```

It prints the next version and the notes it would generate, and writes nothing.

## Deliberately outside this scheme

These carry their own versions and are not released by the workflow:

- `bean2gain/` (GPL-2.0-only) has its own package and its own domain, and is deployed by hand
- `tools/beancount-oracle/` is a test package and is never published
- `build.sbt` pins `version := "0.1"`, which nothing reads. The Scala jar is only ever consumed as
  the Docker image above, and that image carries the release version.
