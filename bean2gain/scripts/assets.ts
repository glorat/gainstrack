#!/usr/bin/env node
// GPL-2.0-only — see ../LICENSE and ../README.md.
//
// Assemble the Python distribution this site serves.
//
// Everything the interpreter needs has to come from our own origin, or the site is neither offline
// nor honest about where its beancount comes from. Two sources:
//
//   * the interpreter itself — pyodide.asm.{js,wasm}, the standard library and the lock file — is
//     in the npm package already, so it is copied;
//   * beancount's dependencies are *not*: they belong to Pyodide's own package distribution, which
//     npm does not carry. They are fetched once from the pinned CDN and cached here.
//
// (beancount itself is in neither place: it is embedded in the JavaScript bundle by
// `beancount-wasm`, so the wheel under test can never be swapped out from under us at runtime.)
//
// Run automatically before `dev` and `build`. After the first run it needs no network.

import { createRequire } from 'node:module';
import { access, copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The distribution is served from a directory named for its version.
 *
 * Not cosmetic: `pyodide.asm.wasm` and its siblings have no version in their own names, so an
 * upgrade would otherwise rewrite the same URLs — and a service worker that caches them first
 * would pin returning visitors to the old interpreter forever, running it under a new bundle that
 * was never tested against it. Versioning the path makes the runtime content-addressed, the way
 * the build already treats `assets/`.
 */
const ROOT = resolve(HERE, '..', 'public', 'pyodide');

const require = createRequire(import.meta.url);
const PYODIDE = dirname(require.resolve('pyodide/package.json'));

/** Shipped in the npm package. `pyodide.mjs` is loaded by the bundler, not from here. */
const CORE = ['pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];

/**
 * beancount's dependencies, by their names in Pyodide's lock file.
 *
 * `micropip` installs the wheel; the other four are what beancount 3 imports. They are resolved
 * through `pyodide-lock.json`, so the file names have to match it exactly — which is why they are
 * read out of the lock rather than written down here.
 */
const NEEDED = ['micropip', 'click', 'python-dateutil', 'regex', 'six'];

interface Lock {
  info: { version: string };
  packages: Record<string, { name: string; file_name: string; depends: string[] }>;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Every package `NEEDED` transitively depends on, so a fetch cannot leave a hole behind. */
function closure(lock: Lock): string[] {
  const byName = new Map(Object.values(lock.packages).map((entry) => [entry.name, entry]));
  const seen = new Set<string>();
  const queue = [...NEEDED];

  while (queue.length > 0) {
    const name = queue.shift()!;
    if (seen.has(name)) continue;
    const entry = byName.get(name);
    if (!entry) {
      // A dependency that is not in the distribution would be fetched from PyPI at runtime, which
      // is exactly the network dependency this script exists to remove.
      throw new Error(`${name} is not in pyodide-lock.json — cannot vendor it`);
    }
    seen.add(name);
    queue.push(...entry.depends);
  }

  return [...seen].map((name) => byName.get(name)!.file_name);
}

async function main(): Promise<void> {
  // The lock file's own `info.version` is a build-time placeholder (`0.28.0.dev0` in 0.29.3), so
  // the version has to come from the npm package instead.
  const { version } = JSON.parse(
    await readFile(join(PYODIDE, 'package.json'), 'utf8'),
  ) as { version: string };

  const TARGET = join(ROOT, version);
  await mkdir(TARGET, { recursive: true });

  for (const file of CORE) {
    await copyFile(join(PYODIDE, file), join(TARGET, file));
  }

  const lock = JSON.parse(await readFile(join(TARGET, 'pyodide-lock.json'), 'utf8')) as Lock;
  const cdn = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`;

  const wanted = closure(lock);
  const missing: string[] = [];
  for (const file of wanted) {
    if (await exists(join(TARGET, file))) continue;
    // pyodide caches downloads into its own package directory when it runs under Node, so a wheel
    // fetched by the verification harness can be reused instead of downloaded again.
    if (await exists(join(PYODIDE, file))) {
      await copyFile(join(PYODIDE, file), join(TARGET, file));
      continue;
    }
    missing.push(file);
  }

  for (const file of missing) {
    process.stderr.write(`fetching ${file}\n`);
    const response = await fetch(cdn + file);
    if (!response.ok) {
      throw new Error(`${cdn}${file} → HTTP ${response.status}`);
    }
    await writeFile(join(TARGET, file), Buffer.from(await response.arrayBuffer()));
  }

  // This project is `"type": "module"`, which would otherwise make Node treat the copied
  // pyodide.asm.js as ESM and fail on its first `require`. Browsers never look at this file; the
  // specs, which load the distribution the same way the site does, depend on it.
  await writeFile(join(TARGET, 'package.json'), '{ "type": "commonjs" }\n');

  // The one file at a stable URL, and the only thing that has to be fetched fresh: it is how the
  // app and the service worker learn which version is current. Everything else hangs off `base`.
  await writeFile(
    join(ROOT, 'manifest.json'),
    `${JSON.stringify(
      { version, base: `pyodide/${version}/`, files: [...CORE, ...wanted].sort() },
      null,
      2,
    )}\n`,
  );

  // A superseded distribution left here would be deployed alongside the current one — 13 MB of
  // dead weight, and a second answer to "which interpreter does this site serve". This also sweeps
  // up the flat layout that predated versioned directories.
  for (const entry of await readdir(ROOT)) {
    if (entry !== version && entry !== 'manifest.json') {
      await rm(join(ROOT, entry), { recursive: true, force: true });
    }
  }

  process.stderr.write(
    `pyodide ${version}: ${CORE.length} core files, ${wanted.length} wheels` +
      `${missing.length > 0 ? ` (${missing.length} downloaded)` : ' (all cached)'}\n`,
  );
}

await main();
