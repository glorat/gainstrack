/**
 * Packaging invariant for the Cloud Functions deploy artifact.
 *
 * firebase.json deploys `source: "functions"`, so only this directory and a clean
 * install of its own package.json ship. Anything the runtime require path reaches
 * must therefore be declared here. Locally that is easy to violate without noticing:
 * this package sits inside client/, so Node resolution walks up into
 * client/node_modules and finds packages that will not exist on the deployed
 * instance. tsc does not catch it either — it resolves the same way.
 *
 * This test walks the module graph from the deployed entry point and asserts every
 * external package is declared. It fails on the developer machine, not on cold start.
 */
import {describe, it, expect} from 'vitest';
import {readFileSync, existsSync} from 'node:fs';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {builtinModules} from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const entry = join(pkgRoot, 'src/index.ts');

const builtins = new Set([...builtinModules, ...builtinModules.map(m => `node:${m}`)]);

/** `@scope/pkg/sub` -> `@scope/pkg`; `pkg/sub` -> `pkg`. */
function rootPackage(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** Resolves a relative import the way tsc/node would, trying .ts then /index.ts. */
function resolveRelative(fromFile: string, specifier: string): string | undefined {
  const base = resolve(dirname(fromFile), specifier);
  for (const candidate of [`${base}.ts`, join(base, 'index.ts'), base]) {
    if (existsSync(candidate) && candidate.endsWith('.ts')) return candidate;
  }
  return undefined;
}

/** Every `from '…'` / `require('…')` specifier in a source file. */
function specifiersIn(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const out: string[] = [];
  const patterns = [/\bfrom\s+['"]([^'"]+)['"]/g, /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) out.push(m[1]);
  }
  return out;
}

/** Walks relative imports from the entry point, collecting external package roots. */
function externalPackages(entryFile: string): Map<string, string[]> {
  const seen = new Set<string>();
  const external = new Map<string, string[]>();
  const queue = [entryFile];

  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);

    for (const spec of specifiersIn(file)) {
      if (spec.startsWith('.')) {
        const next = resolveRelative(file, spec);
        if (next) queue.push(next);
        continue;
      }
      if (builtins.has(spec)) continue;
      const root = rootPackage(spec);
      const importers = external.get(root) ?? [];
      importers.push(file.replace(`${pkgRoot}/`, ''));
      external.set(root, importers);
    }
  }
  return external;
}

describe('deploy artifact', () => {
  it('only imports packages declared in its own dependencies', () => {
    const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'));
    const declared = new Set(Object.keys(pkg.dependencies ?? {}));

    const used = externalPackages(entry);
    const undeclared = [...used.entries()]
      .filter(([name]) => !declared.has(name))
      .map(([name, importers]) => `${name} (imported by ${[...new Set(importers)].join(', ')})`);

    expect(undeclared).toEqual([]);
  });
});
