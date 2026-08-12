// GPL-2.0-only — see ../LICENSE and ../README.md.
//
// The embedded conversation, with nothing browser-specific in it.
//
// `embed.ts` supplies a window and a real interpreter; the spec supplies a MessageChannel and a
// stub. That split is not ceremony: the wire contract is the thing another site depends on, so it
// is the thing most worth testing without a 13 MB interpreter in the way.

import { countByType, type DumpDocument } from './schema.ts';
import {
  isConnectMessage,
  isDumpMessage,
  PROTOCOL_VERSION,
  READY,
  RESULT,
  type ResultMessage,
} from './protocol.ts';

/** Just enough of the engine for the bridge; the spec passes a stub with the same shape. */
export interface DumpEngine {
  info: { beancount: string };
  dump(request: {
    files: { name: string; content: string }[];
    entry?: string;
    indent?: number;
  }): Promise<{ json: string; document: DumpDocument; millis: number }>;
}

export interface ServeOptions {
  /** Called with human-readable progress, for the status line nobody is meant to see. */
  onStatus?: (message: string) => void;
}

/**
 * Answer dump requests arriving on a port until it closes.
 *
 * Requests are handled one at a time. Concurrency would buy nothing — there is a single
 * interpreter behind this — and serialising here means a caller that fires two conversions at once
 * gets two correct answers rather than two interleaved ones sharing a filesystem.
 */
export function serveDumpRequests(
  port: MessagePort,
  engine: DumpEngine | (() => Promise<DumpEngine>),
  { onStatus }: ServeOptions = {},
): void {
  const resolve = typeof engine === 'function' ? engine : () => Promise.resolve(engine);
  let queue: Promise<unknown> = Promise.resolve();

  port.onmessage = (event: MessageEvent) => {
    const request = event.data;
    if (!isDumpMessage(request)) return;

    queue = queue.then(async () => {
      try {
        onStatus?.(`Converting ${request.files.length} file(s)…`);
        const ready = await resolve();
        const result = await ready.dump({
          files: request.files,
          entry: request.entry,
          indent: request.indent,
        });

        post(port, {
          type: RESULT,
          id: request.id,
          ok: true,
          json: result.json,
          summary: {
            entries: result.document.entries.length,
            errors: result.document.errors.length,
            byType: countByType(result.document),
            millis: Math.round(result.millis),
            beancount: ready.info.beancount,
          },
        });
        onStatus?.(`Converted ${result.document.entries.length} entries.`);
      } catch (error) {
        // Only the message crosses. A Python traceback is not structured-cloneable, and letting one
        // near `postMessage` would turn a reportable failure into a silent one.
        const message = error instanceof Error ? error.message : String(error);
        post(port, { type: RESULT, id: request.id, ok: false, error: message });
        onStatus?.(`Failed: ${message}`);
      }
    });
  };

  port.start();
}

function post(port: MessagePort, message: ResultMessage): void {
  port.postMessage(message);
}

export interface ConnectOptions {
  /** Origins permitted to connect. Empty means any. */
  allowed: readonly string[];
  onPort: (port: MessagePort) => void;
  onRefused?: (origin: string) => void;
}

/**
 * Accept a `connect` handshake and hand over the port it carries.
 *
 * The origin check here is a courtesy, not a defence: a page cannot stop another page loading it
 * in a frame, so `frame-ancestors` in the response headers is what actually enforces this. What
 * the check does buy is a clear refusal in the status line instead of a conversion that silently
 * works from somewhere it should not.
 */
export function acceptConnections(
  target: Window,
  { allowed, onPort, onRefused }: ConnectOptions,
): () => void {
  const listener = (event: MessageEvent) => {
    if (!isConnectMessage(event.data)) return;
    if (allowed.length > 0 && !allowed.includes(event.origin)) {
      onRefused?.(event.origin);
      return;
    }
    const [port] = event.ports;
    if (port) onPort(port);
  };

  target.addEventListener('message', listener as EventListener);
  return () => target.removeEventListener('message', listener as EventListener);
}

/**
 * Tell whoever opened us that we are here.
 *
 * Posted at `*` on purpose: the embedder's origin is not knowable from in here, and the message
 * carries nothing but a version number. Everything of substance happens on the port the embedder
 * sends back.
 */
export function announceReady(parent: Window | null, beancountVersion?: string): void {
  parent?.postMessage(
    { type: READY, protocol: PROTOCOL_VERSION, ...(beancountVersion && { beancount: beancountVersion }) },
    '*',
  );
}
