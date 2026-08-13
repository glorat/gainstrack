// The client half of the conversation with bean2gain.
//
// bean2gain is a separate program on a separate origin under a separate licence (GPL-2.0-only,
// because it contains beancount). Nothing here imports anything from it: this file is a
// from-scratch implementation of a documented message protocol — see `docs/embedding.md` in that
// project — and it would work just as well against any other service that spoke the same one.
// That is the point. Keeping the two linked only by JSON over `postMessage` is what lets this
// application stay AGPL-3.0 while the converter stays GPL-2.0-only.
//
// What crosses the boundary is ledger text one way and a JSON document the other. What comes back
// is beancount's own data model, already booked and resolved; turning that into gainstrack
// commands is our side's job and happens here, in AGPL code.

/** The protocol revision this client speaks. Sent on connect; the far side may refuse a mismatch. */
const PROTOCOL_VERSION = 1;

const READY = 'bean2gain:ready';
const CONNECT = 'bean2gain:connect';
const DUMP = 'bean2gain:dump';
const RESULT = 'bean2gain:result';

export interface LedgerFile {
  /** Relative path; may contain `/` if the ledger includes files from a subdirectory. */
  name: string;
  content: string;
}

export interface ConvertOptions {
  /** Which file is the top-level ledger. Defaults to the first. */
  entry?: string;
  /** Pretty-print the returned JSON with this indent. */
  indent?: number;
}

export interface ConvertResult {
  /** The dump document as text, exactly as `dump.py` wrote it. Parse it on our side. */
  json: string;
  summary: ConvertSummary;
}

export interface ConvertSummary {
  entries: number;
  errors: number;
  byType: Record<string, number>;
  millis: number;
  beancount: string;
}

export interface Bean2GainOptions {
  /** Origin of the converter, e.g. `https://bean2gain.example`. Must not be this origin. */
  origin: string;
  /** Path to the embed endpoint on that origin. */
  path?: string;
  /**
   * How long to wait for the frame to answer, in milliseconds.
   *
   * Generous by default: the far side downloads ~13 MB of interpreter on a first visit, and a
   * large ledger then takes seconds to load. A timeout that fires during a legitimate conversion
   * is worse than no timeout at all, because the retry pays the download again.
   */
  timeoutMs?: number;
  /** Where to attach the hidden frame. Defaults to `document.body`. */
  container?: HTMLElement;
}

export interface Bean2Gain {
  /** Resolves once the converter has answered a handshake — useful for warming it up early. */
  ready(): Promise<void>;
  convert(files: LedgerFile[], options?: ConvertOptions): Promise<ConvertResult>;
  dispose(): void;
}

interface ResultPayload {
  type: typeof RESULT;
  id: string;
  ok: boolean;
  json?: string;
  summary?: ConvertSummary;
  error?: string;
}

/**
 * Open a hidden frame pointing at the converter and talk to it over a MessageChannel.
 *
 * The frame is created once and reused: it holds a loaded Python interpreter, and throwing that
 * away between conversions would make the second one as slow as the first.
 */
export function createBean2Gain(options: Bean2GainOptions): Bean2Gain {
  const { origin, path = '/embed.html', timeoutMs = 180_000, container } = options;

  if (origin === window.location.origin) {
    // Same-origin would still work, and would also quietly destroy the separation the arrangement
    // exists for. Refusing is the only way this stays a mistake rather than a licence problem.
    throw new Error('bean2gain must be served from a different origin');
  }

  const frame = document.createElement('iframe');
  frame.src = `${origin}${path}`;
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('title', 'bean2gain converter');
  // Deliberately *not* sandboxed. A cross-origin frame already cannot reach our DOM, storage or
  // cookies, so the attribute would add nothing — while `allow-scripts` without
  // `allow-same-origin` puts the frame in an opaque origin, which posts messages as `null`
  // (breaking the origin check below) and locks it out of the cache that makes it work offline.
  frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
  (container ?? document.body).append(frame);

  let port: MessagePort | undefined;
  let sequence = 0;
  const waiting = new Map<string, (payload: ResultPayload) => void>();
  let stopListening = () => {};

  const connected = new Promise<MessagePort>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`bean2gain at ${origin} did not respond`)),
      timeoutMs,
    );

    const onMessage = (event: MessageEvent) => {
      // Both checks matter: the origin because any page can post to us, and the source because
      // another frame on the same origin should not be able to answer for this one.
      if (event.origin !== origin || event.source !== frame.contentWindow) return;
      if ((event.data as { type?: unknown })?.type !== READY) return;
      if (port) return; // A second `ready` announces the interpreter has loaded; ignore it.

      const channel = new MessageChannel();
      channel.port1.onmessage = (message: MessageEvent) => {
        const payload = message.data as ResultPayload;
        if (payload?.type !== RESULT) return;
        waiting.get(payload.id)?.(payload);
        waiting.delete(payload.id);
      };
      channel.port1.start();

      frame.contentWindow?.postMessage({ type: CONNECT, protocol: PROTOCOL_VERSION }, origin, [
        channel.port2,
      ]);

      port = channel.port1;
      clearTimeout(timer);
      resolve(channel.port1);
    };

    window.addEventListener('message', onMessage);
    stopListening = () => {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    };
  });

  // A caller that never awaits `ready()` should not get an unhandled rejection when the far side
  // fails to appear; the error still reaches anyone who does await.
  void connected.catch(() => undefined);

  return {
    async ready() {
      await connected;
    },

    async convert(files, convertOptions = {}) {
      const channel = await connected;
      const id = `dump-${++sequence}`;

      return new Promise<ConvertResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          waiting.delete(id);
          reject(new Error('bean2gain did not answer in time'));
        }, timeoutMs);

        waiting.set(id, (payload) => {
          clearTimeout(timer);
          if (payload.ok && payload.json !== undefined && payload.summary) {
            resolve({ json: payload.json, summary: payload.summary });
          } else {
            reject(new Error(payload.error ?? 'bean2gain reported an unspecified failure'));
          }
        });

        channel.postMessage({
          type: DUMP,
          id,
          files,
          entry: convertOptions.entry,
          indent: convertOptions.indent,
        });
      });
    },

    dispose() {
      stopListening();
      port?.close();
      waiting.clear();
      frame.remove();
    },
  };
}
