// GPL-2.0-only — see ../../LICENSE.
//
// The offline cache, exercised as a deployed site experiences it: install, visit, deploy, revisit.
//
// This runs the real `public/sw.js` — the file that ships — inside a synthetic worker scope with a
// fake Cache API and a fake network. Testing a copy would prove nothing; the whole risk here is
// that the shipped worker outlives the release it was written for.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const SW = resolve(HERE, '..', '..', 'public', 'sw.js');
const ORIGIN = 'https://bean2gain.example';

/** A response body identified by which release produced it. */
type Body = string;

class FakeResponse {
  constructor(
    readonly body: Body,
    readonly ok = true,
    readonly init: { url?: string } = {},
  ) {}
  clone(): FakeResponse {
    return new FakeResponse(this.body, this.ok, this.init);
  }
  async json(): Promise<unknown> {
    return JSON.parse(this.body);
  }
  async text(): Promise<string> {
    return this.body;
  }
}

interface FakeRequest {
  url: string;
  method: string;
  mode?: string;
}

/** Enough of the Cache API for the worker: open/keys/delete, and match/put/keys on a cache. */
class FakeCache {
  readonly entries = new Map<string, FakeResponse>();

  /** A browser resolves a string key against the worker's scope; so must this, or `match('./x')`
   *  would miss an entry stored under its absolute URL and the offline fallback would look broken. */
  private key(request: FakeRequest | string): string {
    return typeof request === 'string' ? new URL(request, `${ORIGIN}/`).href : request.url;
  }
  async match(request: FakeRequest | string): Promise<FakeResponse | undefined> {
    return this.entries.get(this.key(request));
  }
  async put(request: FakeRequest | string, response: FakeResponse): Promise<void> {
    this.entries.set(this.key(request), response);
  }
  async delete(request: FakeRequest | string): Promise<boolean> {
    return this.entries.delete(this.key(request));
  }
  async keys(): Promise<FakeRequest[]> {
    return [...this.entries.keys()].map((url) => ({ url, method: 'GET' }));
  }
}

class FakeCacheStorage {
  readonly caches = new Map<string, FakeCache>();
  async open(name: string): Promise<FakeCache> {
    let cache = this.caches.get(name);
    if (!cache) this.caches.set(name, (cache = new FakeCache()));
    return cache;
  }
  async keys(): Promise<string[]> {
    return [...this.caches.keys()];
  }
  async delete(name: string): Promise<boolean> {
    return this.caches.delete(name);
  }
  /** Every URL held anywhere, for asserting what survived a release. */
  cachedUrls(): string[] {
    return [...this.caches.values()].flatMap((cache) => [...cache.entries.keys()]).sort();
  }
}

/**
 * One browser, across as many deployments as a test wants.
 *
 * The worker script is evaluated once — as a browser does — and the network is then swapped
 * underneath it to model a new release. That is the exact situation the worker has to survive: a
 * long-lived registration meeting assets it has never seen.
 */
class Site {
  readonly caches = new FakeCacheStorage();
  private listeners = new Map<string, (event: unknown) => void>();
  private served = new Map<string, Body>();
  offline = false;
  readonly requested: string[] = [];

  constructor() {
    const self_ = {
      location: { origin: ORIGIN },
      addEventListener: (type: string, listener: (event: unknown) => void) => {
        this.listeners.set(type, listener);
      },
      skipWaiting: async () => undefined,
      clients: { claim: async () => undefined },
    };

    const fetch_ = async (request: FakeRequest | string): Promise<FakeResponse> => {
      const url = typeof request === 'string' ? new URL(request, `${ORIGIN}/`).href : request.url;
      this.requested.push(url);
      if (this.offline) throw new Error('offline');
      const body = this.served.get(new URL(url).pathname);
      if (body === undefined) return new FakeResponse('', false);
      return new FakeResponse(body);
    };

    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const run = new Function(
      'self',
      'caches',
      'fetch',
      'URL',
      'console',
      `${readFileSync(SW, 'utf8')}\n//# sourceURL=sw.js`,
    );
    run(self_, this.caches, fetch_, URL, console);
  }

  /** Replace what the origin serves, as a deploy would. */
  deploy(files: Record<string, Body>): void {
    this.served = new Map(Object.entries(files));
  }

  async activate(): Promise<void> {
    const listener = this.listeners.get('activate');
    if (!listener) return;
    let waited: Promise<unknown> = Promise.resolve();
    listener({ waitUntil: (promise: Promise<unknown>) => (waited = promise) });
    await waited;
  }

  /** A page request, answered by the worker. Returns undefined if the worker declined to handle it. */
  async get(path: string, mode = 'no-cors'): Promise<Body | undefined> {
    return this.request({ url: `${ORIGIN}${path}`, method: 'GET', mode });
  }

  async request(request: FakeRequest): Promise<Body | undefined> {
    const listener = this.listeners.get('fetch');
    if (!listener) throw new Error('the worker registered no fetch handler');

    let responded: Promise<FakeResponse> | undefined;
    // Work the worker extends past the response — cache housekeeping — arrives on waitUntil. The
    // response must not wait for it, but the assertions that follow must, or they race it.
    const background: Promise<unknown>[] = [];
    listener({
      request,
      respondWith: (promise: Promise<FakeResponse>) => (responded = promise),
      waitUntil: (promise: Promise<unknown>) => background.push(promise),
    });
    if (!responded) return undefined;
    const body = (await responded).body;
    await Promise.all(background);
    return body;
  }
}

/**
 * What a release puts on the origin.
 *
 * The interpreter path comes from the manifest rather than being spelled out here, because that is
 * the contract the build, the app and the worker all read. A test that hard-coded the layout would
 * pass for a fix that only changed the test.
 */
function release(version: string): Record<string, Body> {
  const manifest = JSON.parse(
    readFileSync(resolve(HERE, '..', '..', 'public', 'pyodide', 'manifest.json'), 'utf8'),
  ) as { version: string; base?: string };
  // Take the real layout and swap in a hypothetical version. If the build puts the version in the
  // path, two releases get two URLs; if it does not, they collide — which is the bug under test.
  const base = (manifest.base ?? 'pyodide/').replaceAll(manifest.version, version);
  return {
    '/pyodide/manifest.json': JSON.stringify({ version, base, files: ['pyodide.asm.wasm'] }),
    [`/${base}pyodide.asm.wasm`]: `interpreter-${version}`,
    '/index.html': `shell-${version}`,
    [`/assets/index-${version}.js`]: `bundle-${version}`,
  };
}

function interpreterPath(version: string): string {
  const files = release(version);
  return Object.keys(files).find((path) => path.endsWith('pyodide.asm.wasm'))!;
}

describe('the service worker', () => {
  let site: Site;

  beforeEach(() => {
    site = new Site();
    site.deploy(release('1.0.0'));
  });

  it('serves the interpreter from cache on a second visit', async () => {
    const path = interpreterPath('1.0.0');
    expect(await site.get(path)).toBe('interpreter-1.0.0');

    const before = site.requested.length;
    expect(await site.get(path)).toBe('interpreter-1.0.0');
    // The whole point of cache-first: 25 MB is not re-fetched to be told it has not changed.
    expect(site.requested.length).toBe(before);
  });

  it('runs the new interpreter after an upgrade, not the cached one', async () => {
    await site.get(interpreterPath('1.0.0'));

    // A later release. The registration is long-lived and survives it, which is exactly the case
    // that strands a visitor on an interpreter the new bundle was never tested against.
    site.deploy(release('2.0.0'));
    await site.activate();

    expect(await site.get(interpreterPath('2.0.0'))).toBe('interpreter-2.0.0');
  });

  it('evicts the superseded interpreter rather than keeping both forever', async () => {
    await site.get(interpreterPath('1.0.0'));
    site.deploy(release('2.0.0'));
    await site.activate();
    await site.get(interpreterPath('2.0.0'));

    const stale = site.caches.cachedUrls().filter((url) => url.includes('1.0.0'));
    expect(stale, 'the old interpreter is still cached').toEqual([]);
  });

  it('takes the app shell from the network when online', async () => {
    expect(await site.get('/assets/index-1.0.0.js')).toBe('bundle-1.0.0');

    site.deploy(release('2.0.0'));
    expect(await site.get('/assets/index-2.0.0.js')).toBe('bundle-2.0.0');
  });

  it('falls back to the cached shell when offline', async () => {
    await site.get('/index.html');
    site.offline = true;

    expect(await site.get('/index.html', 'navigate')).toBe('shell-1.0.0');
    expect(await site.get('/deep/link', 'navigate')).toBe('shell-1.0.0');
  });

  it('declines requests it has no business answering', async () => {
    // Not calling respondWith leaves these to the browser. Caching a POST, or anything from another
    // origin, would be a bug with consequences well beyond staleness.
    expect(await site.request({ url: `${ORIGIN}/index.html`, method: 'POST' })).toBeUndefined();
    expect(await site.request({ url: 'https://elsewhere.example/x.js', method: 'GET' })).toBeUndefined();
    expect(site.caches.cachedUrls()).toEqual([]);
  });
});
