// GPL-2.0-only — see ../LICENSE and ../README.md.
//
// The wire contract between this site and whatever embeds it.
//
// It is deliberately a *contract*, not a library: the caller lives on another origin under another
// licence, and the point of the exercise is that it links to nothing here. Everything below is
// either a type (which carries no code) or a string constant, and a caller is expected to
// reimplement the four-line client rather than import one from us. `docs/embedding.md` spells the
// whole conversation out so that reimplementation is mechanical.
//
// The shape of the exchange:
//
//   1. the embedder loads `/embed.html` in an iframe
//   2. this side posts `ready` to the opener, at `*` — it cannot know the embedder's origin yet
//   3. the embedder posts `connect` back, transferring one end of a MessageChannel
//   4. every request and response after that runs over the port
//
// The channel matters: once the port is open, neither side has to guess at origins or filter other
// frames' traffic out of a shared `message` handler.

export const PROTOCOL_VERSION = 1;

export const READY = 'bean2gain:ready';
export const CONNECT = 'bean2gain:connect';
export const DUMP = 'bean2gain:dump';
export const RESULT = 'bean2gain:result';

/** Posted to the embedder as soon as this side can accept a connection. */
export interface ReadyMessage {
  type: typeof READY;
  protocol: number;
  /** Which beancount is installed. Absent until the interpreter has loaded. */
  beancount?: string;
}

/** The embedder's reply, transferring `[port]` alongside. */
export interface ConnectMessage {
  type: typeof CONNECT;
  protocol: number;
}

export interface DumpMessage {
  type: typeof DUMP;
  /** Echoed back on the response; the embedder correlates with it. */
  id: string;
  /** The ledger, plus anything it includes. Names are relative and may contain `/`. */
  files: { name: string; content: string }[];
  /** Which file is the top-level ledger. Defaults to the first. */
  entry?: string;
  /** Pretty-print the JSON with this indent. */
  indent?: number;
}

export type ResultMessage =
  | {
      type: typeof RESULT;
      id: string;
      ok: true;
      /**
       * The document as **text**, not as an object.
       *
       * Structured clone would hand over a JavaScript object graph; a string keeps the exchange
       * unambiguously a data interchange, and the numbers inside it are already strings so nothing
       * is lost by not parsing here.
       */
      json: string;
      /** Enough to show progress without parsing a megabyte of JSON on the caller's side. */
      summary: DumpSummary;
    }
  | {
      type: typeof RESULT;
      id: string;
      ok: false;
      error: string;
    };

export interface DumpSummary {
  entries: number;
  errors: number;
  byType: Record<string, number>;
  millis: number;
  beancount: string;
}

export type InboundMessage = ConnectMessage | DumpMessage;
export type OutboundMessage = ReadyMessage | ResultMessage;

export function isConnectMessage(value: unknown): value is ConnectMessage {
  return isTagged(value, CONNECT);
}

export function isDumpMessage(value: unknown): value is DumpMessage {
  if (!isTagged(value, DUMP)) return false;
  const message = value as Partial<DumpMessage>;
  return (
    typeof message.id === 'string' &&
    Array.isArray(message.files) &&
    message.files.every(
      (file) => typeof file?.name === 'string' && typeof file?.content === 'string',
    )
  );
}

function isTagged(value: unknown, type: string): boolean {
  return typeof value === 'object' && value !== null && (value as { type?: unknown }).type === type;
}
