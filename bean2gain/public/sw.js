// GPL-2.0-only — see ../LICENSE and ../README.md.
//
// Offline support, hand-written rather than generated: this site has one job and about a dozen
// assets, and a build-time precache manifest would be more machinery than the problem deserves.
//
// Three strategies, because the assets differ in kind:
//
//   * `pyodide/<version>/…` — 13 MB of interpreter and wheels. The version is in the path, so a
//     given URL's bytes never change, so cache-first is safe *and* correct. Once fetched it is
//     never re-requested, which is what makes a second visit fast rather than merely possible.
//   * `pyodide/manifest.json` — the one file at a stable URL, and how the app learns which version
//     is current. It must be network-first or an upgrade could never be discovered: the app would
//     keep asking for the old `base`, find it cached, and run last year's interpreter forever.
//   * everything else — the app shell, whose filenames are content-hashed by the build. Network-
//     first, so a new deploy is picked up immediately when online and the last one still starts
//     when not.
//
// Note what this file cannot rely on: itself changing. A service worker only re-installs when its
// own bytes differ, and this one is static across releases — so `activate` may never run again
// after the first visit. Anything that has to happen per release therefore happens on `fetch`.

const CACHE = 'bean2gain-v1';

/** `pyodide/<version>/rest` — the version is capture 1. */
const RUNTIME = /\/pyodide\/([^/]+)\//;
const MANIFEST = '/pyodide/manifest.json';

self.addEventListener('install', (event) => {
  // No precache list: the shell's file names are hashed and unknowable from here, and the runtime
  // is far too big to download before the visitor has asked for anything.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name !== CACHE) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith(MANIFEST)) {
    event.respondWith(networkFirst(request));
    return;
  }

  const runtime = url.pathname.match(RUNTIME);
  if (runtime) {
    event.respondWith(cacheFirst(request));
    // Not awaited by the response: evicting last release's interpreter must not delay this one.
    event.waitUntil(evictOtherVersions(runtime[1]));
    return;
  }

  event.respondWith(networkFirst(request));
});

/**
 * Drop every cached runtime asset that is not the version being asked for.
 *
 * The app only ever requests the version its manifest names, so the first runtime fetch after an
 * upgrade is a reliable signal that the previous one is dead. Without this the cache would grow by
 * 13 MB per release and never shrink, since nothing else here ever deletes an entry.
 */
async function evictOtherVersions(version) {
  const cache = await caches.open(CACHE);
  for (const request of await cache.keys()) {
    const match = new URL(request.url).pathname.match(RUNTIME);
    if (match && match[1] !== version) await cache.delete(request);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) return hit;
    // A navigation to a URL we have never seen still has to render something: the app is a single
    // page, so the cached shell is the right answer.
    if (request.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    throw error;
  }
}
