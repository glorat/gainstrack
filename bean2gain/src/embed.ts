// GPL-2.0-only — see ../LICENSE and ../README.md.
//
// `/embed.html`: this site with the UI taken off, loaded in a hidden iframe and driven over a
// MessageChannel. The conversation itself lives in bridge.ts; all this does is wire it to a real
// window and a real interpreter.

import { beancount } from './beancount.ts';
import { acceptConnections, announceReady, serveDumpRequests } from './bridge.ts';

/**
 * Origins allowed to embed this page, as a comma-separated build-time list.
 *
 * Empty means anyone, which is the honest default for a page that holds no secrets and answers
 * only with a transform of what it was just handed. Narrow it with `VITE_EMBED_ORIGINS`, and set
 * `frame-ancestors` in the deployment's headers — that is the check the browser enforces.
 */
const ALLOWED = (import.meta.env.VITE_EMBED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const status = document.querySelector('#status');
const note = (message: string) => {
  if (status) status.textContent = message;
};

const engine = () => beancount({ onStatus: note });

let current: MessagePort | undefined;

acceptConnections(window, {
  allowed: ALLOWED,
  onPort: (port) => {
    // A second connect replaces the first rather than accumulating: an embedder that reloads
    // should not leave a dead port holding a place in the queue.
    current?.close();
    current = port;
    serveDumpRequests(port, engine, { onStatus: note });
    note('Connected.');
  },
  onRefused: (origin) => note(`Refused a connection from ${origin}.`),
});

announceReady(window.parent);
note('Waiting for a connection…');

// Start loading now rather than on the first request: an embedder that opens the frame early gets
// the couple of seconds for free, and the second `ready` tells it when that has happened.
void engine()
  .then((ready) => announceReady(window.parent, ready.info.beancount))
  .catch((error: unknown) => note(`Failed to load: ${error instanceof Error ? error.message : String(error)}`));
