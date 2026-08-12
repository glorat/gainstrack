# Driving bean2gain from another site

bean2gain converts a beancount ledger to JSON. It can do that for another web application without
that application containing any part of it — which is the point, because bean2gain is
**GPL-2.0-only** (it contains beancount) and the applications that want it may not be.

The two programs meet at a `postMessage` channel carrying JSON. Nothing is imported, linked or
bundled across the line, in either direction.

## Do not import a client from here

There is no npm package to install, and `src/protocol.ts` is documentation rather than an artifact
to depend on. Write the client yourself — it is about eighty lines, all of it plumbing, and every
line of it belongs to you. Copying the sketch below is fine; it is a description of a protocol, not
a work of authorship worth arguing about.

## The conversation

```
embedder                                     bean2gain (/embed.html)
   │                                                │
   ├─ loads the page in a hidden iframe ───────────►│
   │                                                │
   │◄──────── {type:'bean2gain:ready', protocol:1} ─┤   posted at '*'
   │                                                │
   ├─ {type:'bean2gain:connect', protocol:1} ──────►│   with [port2] transferred
   │                                                │
   │◄──────── {type:'bean2gain:ready', protocol:1,  ┤   again, once Python has loaded
   │           beancount:'3.2.0'}                   │
   │                                                │
   ├═ {type:'bean2gain:dump', id, files, entry} ═══►│   over the port
   │                                                │
   │◄═ {type:'bean2gain:result', id, ok, json,  ════┤
   │    summary}                                    │
```

Two details are load-bearing:

**`ready` is posted at `*`.** A framed page cannot know its embedder's origin, so it cannot target
the message. This is safe because the message carries nothing but a version number, and because
everything of substance happens afterwards on a port only the embedder holds.

**Requests run over a `MessagePort`, not over `window.postMessage`.** Once the port is open neither
side has to guess at origins or sift another frame's traffic out of a shared handler. It also means
a page can hold several converters at once without them hearing each other.

## Messages

### `bean2gain:ready` — converter to embedder

```ts
{ type: 'bean2gain:ready', protocol: 1, beancount?: string }
```

Sent twice: once when the page can accept a connection, and again when the interpreter has finished
loading, that time with the beancount version. Treat the second as advisory — a request sent before
it arrives is queued, not dropped.

**Verify both `event.origin` and `event.source`** before acting on it. The origin because any page
can post to yours; the source because another frame on the same origin should not be able to answer
for the one you opened.

### `bean2gain:connect` — embedder to converter

```ts
frame.contentWindow.postMessage(
  { type: 'bean2gain:connect', protocol: 1 },
  'https://bean2gain.example',       // never '*' — this one has a known destination
  [channel.port2],
);
```

The converter may be configured with an origin allowlist, in which case a connection from elsewhere
is refused silently. That check is a courtesy; `frame-ancestors` in the response headers is what a
browser actually enforces.

### `bean2gain:dump` — embedder to converter, over the port

```ts
{
  type: 'bean2gain:dump',
  id: string,                                     // echoed back; correlate with it
  files: { name: string, content: string }[],     // the ledger, plus anything it includes
  entry?: string,                                 // which file is top-level; defaults to the first
  indent?: number,                                // pretty-print the JSON
}
```

`name` is a relative path and may contain `/`. Absolute paths and `..` are rejected. Requests are
served one at a time — there is a single interpreter behind them — so two in flight get two correct
answers rather than two interleaved ones.

### `bean2gain:result` — converter to embedder, over the port

```ts
{ type: 'bean2gain:result', id, ok: true,  json: string, summary: DumpSummary }
{ type: 'bean2gain:result', id, ok: false, error: string }
```

```ts
interface DumpSummary {
  entries: number;
  errors: number;                       // beancount's own loader errors, not failures to convert
  byType: Record<string, number>;       // e.g. { transaction: 1025, open: 63, price: 816 }
  millis: number;
  beancount: string;
}
```

`json` is **text**, not an object. That is deliberate: a string keeps the exchange unambiguously a
data interchange rather than a shared object graph, and it loses nothing, because every number in
the document is already a string. (`dump.py` emits them that way because beancount computes in
`decimal.Decimal`, and a lot cost that has been through a JSON float no longer balances against the
cash leg it came from.)

`errors` being non-zero is not a failed conversion. A ledger with a failing balance assertion still
converts; beancount says which assertion it rejects, and the document says so too.

## A minimal client

```ts
const frame = document.createElement('iframe');
frame.src = 'https://bean2gain.example/embed.html';
frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
document.body.append(frame);

const port = await new Promise<MessagePort>((resolve) => {
  window.addEventListener('message', function onReady(event) {
    if (event.origin !== 'https://bean2gain.example') return;
    if (event.source !== frame.contentWindow) return;
    if (event.data?.type !== 'bean2gain:ready') return;
    window.removeEventListener('message', onReady);

    const channel = new MessageChannel();
    frame.contentWindow!.postMessage(
      { type: 'bean2gain:connect', protocol: 1 },
      'https://bean2gain.example',
      [channel.port2],
    );
    channel.port1.start();
    resolve(channel.port1);
  });
});

const json = await new Promise<string>((resolve, reject) => {
  port.onmessage = (event) =>
    event.data.ok ? resolve(event.data.json) : reject(new Error(event.data.error));
  port.postMessage({
    type: 'bean2gain:dump',
    id: '1',
    files: [{ name: 'ledger.beancount', content: ledgerText }],
  });
});
```

Do not sandbox the frame. A cross-origin frame already cannot reach your DOM, storage or cookies,
so the attribute adds nothing — while `allow-scripts` without `allow-same-origin` puts the frame in
an opaque origin, which posts as `null` (breaking the origin check) and locks it out of the cache
that lets it work offline.

## What to expect of it

- **The first conversion is slow.** Around 13 MB of interpreter, standard library and wheels are
  downloaded, then Python starts. Two seconds of that is startup even when everything is cached.
  Open the frame early — it loads while your user is still deciding.
- **After that it is fast.** A 2000-entry ledger dumps in about 220 ms, which is native speed.
- **It works offline** once the assets are cached, and there is a button on the standalone page to
  fetch them deliberately.
- **Nothing is uploaded.** Both halves run in the browser. This matters for the obvious reason:
  a complete financial history is not something to ask people to upload for a format conversion.

## Then what?

You have beancount's data model, fully booked: elided amounts interpolated, includes resolved,
`pad` expanded, and every posting's lot cost chosen under the account's booking method. What you do
with it is yours, on your side of the line, under your licence. GPL does not reach a program's
output, and the JSON is output.

The consumer this was built for, as an example of the shape: it lowers every beancount transaction
into a single raw multi-posting command, then lifts the recognizable two-posting ones into
intent-carrying commands of its own. It has never seen a line of beancount.
