---
name: tdd-bugfix
description: Apply a red/green TDD loop when fixing a reported bug, reproducing a defect, or investigating a regression. Use when the user describes incorrect behavior, points at a failing scenario, or asks for a fix — OR when Claude's own investigation confirms a bug exists. Skip for new features, refactors, or pure-visual polish where a test would be theater.
---

# TDD Bug Fix

When fixing a bug in this codebase, follow a red/green loop instead of jumping straight to a fix. The goal is an executable regression test that proves the bug existed and proves it's gone.

## The loop

1. **Reproduce in conversation first.** Confirm the exact inputs, observed behavior, and expected behavior before writing code. For this app that usually means: which gainstrack commands (the plain-text DSL) produce the wrong number/report, and what the right number is. For UI bugs, reproduce against the running dev server using the `playwright-cli` skill (drive the app at `http://localhost:8080`, snapshot the buggy state) before deciding on a test surface. If you can't reproduce, ask — don't guess. If Claude found the bug through its own investigation, the moment of confirmation is the trigger — invoke the skill then.
2. **Write a failing test (red).** Add it at the surface picked below. Name it after the *behavior* (`"converts via USD when no direct FX rate exists"`), not the function.
3. **Run the test and confirm it fails for the right reason.** A test that fails because of a typo, missing import, or wrong mock is worse than no test. Read the assertion diff before moving on.
4. **Make the minimal change to pass (green).** No surrounding cleanup, no refactors, no speculative hardening in this step. If you spot adjacent issues, mention them — don't fix them.
5. **Run checks.** Frontend: `pnpm run type-check` from `client/` (must pass for every touched `.ts`/`.vue` file — but pre-existing errors in the old Options API components without `lang="ts"` are not yours to fix). Backend: `sbt compile` at minimum.
6. **Report back.** One or two sentences: what was wrong, what the test asserts, what changed.

## Picking the right test surface

Pick the level where the assertion is *meaningful*, not the lowest level you can reach. Most report bugs in this app are computed **locally in the browser** (`localCompute = true` in `src/lib/apiFacade.ts`), so most bugs land in the pure-logic tier — that's the best case for TDD.

- **Pure client logic** (parser, pricer/FX chain, `AllStateEx`, report calculators, formatters, store logic) — straight Vitest, no mocks needed. Colocate in `client/src/lib/__tests__/yourBug.spec.ts`, mirroring the existing tests there. When the buggy predicate lives inline in a component, prefer extracting it into `src/lib/` so it can be tested as a pure function — that's the established pattern here, not an extra step.
- **Bugs that need a realistic `AllState`** — don't hand-craft giant fixtures. Reuse the fixture approach in `client/test/unit/` (`first.json`, `james.json`, and `client/src/lib/__tests__/fixtures/`): load a fixture, or better, build state from a small gainstrack DSL snippet through the parser, then assert on the computed report. A test whose input is the DSL text documents the repro exactly as a user would hit it.
- **Component rendering/interaction bugs** (wrong data shown, broken flow given state) — a `@vue/test-utils` `shallowMount` test in `client/test/unit/`. Vitest already runs everything in jsdom (single environment, global setup in `client/test/setup.ts` — no per-file environment pragma needed). Follow the existing convention (see `AssetView.spec.ts`): mock `quasar` by spreading the real module and overriding only `useQuasar`, mock `vue-router` and `src/stores` with `vi.mock`, seed props/store, assert on rendered output. Full `mount` of Quasar components crashes in jsdom — use `shallowMount`. The `playwright-cli` skill complements this tier — use it to reproduce before writing the test and to confirm the fix in the real app afterwards — but it is an interactive session, not an executable regression test, so it doesn't replace the red test.
- **Scala domain/report bugs** (`GainstrackParser`, `GainstrackGenerator` passes, command types) — a ScalaTest case in `core/src/test/scala/` (or `web/src/test/scala/` for controller behavior), following the existing test style there. Note: if the same logic also exists in the TS port (`client/src/lib/`), check whether the bug exists on both sides and fix both — the TS pipeline port means logic is duplicated during the migration.
- **Avoid mocking just to keep a test "unit-sized."** If the test would only pass because of how the mock is wired, it isn't proving anything. For logic bugs, feed real DSL text through the real parser and real generator functions.

## When to skip TDD and say so

Some bugs make a test theater. Call it out explicitly and propose a manual repro instead of forcing a test:

- **Pure-visual bugs** — layout, CSS, Quasar styling, Plotly chart appearance. jsdom can't see CSS. Verify against the dev server (`pnpm run quasar`) with the `playwright-cli` skill — reproduce before the fix, screenshot/snapshot after — and describe that verification in your report. A *behavioral* UI bug — wrong data shown, broken flow — is **not** in this category: it gets a shallowMount test.
- **Auth / Firebase / external-service integration bugs** (Auth0 flow, Firestore reads, Alpha Vantage) — there's no emulator or integration test lane in this repo; mocking the whole service would be tautological. Fix, then verify the live flow against dev with `playwright-cli` where the flow is browser-reachable, and note the verification steps in your report.
- **Type-level bugs** — caught by `pnpm run type-check`, not by a Vitest test.
- **Race conditions / async ordering** — worth a test if the bug recurs; usually overkill for a one-off. Use judgment.
- **One-line typo fixes** with obviously correct behavior and no plausible regression vector — a test would just restate the code.

If you skip, say *why* in your report so the reporter can push back.

## Running tests

Frontend — target just the new file during the red/green loop:

```bash
cd client
pnpm run test:unit -- src/lib/__tests__/yourBug.spec.ts
```

Backend — single test class:

```bash
sbt "core/testOnly com.gainstrack.core.test.YourBugSpec"
```

Before finishing, run the full relevant suite once (`pnpm run test:unit` from `client/`, or `sbt test`) to catch collateral breakage.

## What "minimal" means in the green step

- Fix the bug. Nothing else.
- No renaming nearby variables, no extracting helpers beyond what the test surface requires, no tightening unrelated types, no adding logs "while you're in there."
- If the fix reveals the surrounding code is structurally wrong, stop and raise it as a separate decision. Don't quietly expand scope.

A clean follow-up commit is better than a bundled fix that's hard to review or revert.
