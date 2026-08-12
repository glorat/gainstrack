// GPL-2.0-only — see ../../LICENSE.
//
// The wire contract, over a real MessageChannel and a stub engine. This is what another site
// depends on, so it is tested without the 13 MB interpreter that would otherwise dominate it.

import { describe, expect, it, vi } from 'vitest';
import { acceptConnections, announceReady, serveDumpRequests, type DumpEngine } from '../bridge.ts';
import { CONNECT, DUMP, PROTOCOL_VERSION, READY, RESULT, type ResultMessage } from '../protocol.ts';
import type { DumpDocument } from '../schema.ts';

function document_(entries: { type: string; date: string }[] = []): DumpDocument {
  return { schema: 1, source: '/ledger/x.beancount', options: {}, errors: [], entries };
}

function stubEngine(overrides: Partial<DumpEngine> = {}): DumpEngine {
  return {
    info: { beancount: '3.2.0' },
    dump: async () => ({
      json: '{"schema":1}',
      document: document_([{ type: 'open', date: '2024-01-01' }]),
      millis: 1.4,
    }),
    ...overrides,
  };
}

/** Resolves with the next message the port receives. */
function next(port: MessagePort): Promise<ResultMessage> {
  return new Promise((resolve) => {
    port.addEventListener('message', (event) => resolve((event as MessageEvent).data as ResultMessage), {
      once: true,
    });
    port.start();
  });
}

describe('serveDumpRequests', () => {
  it('answers a dump with the JSON and a summary', async () => {
    const { port1, port2 } = new MessageChannel();
    serveDumpRequests(port2, stubEngine());

    const reply = next(port1);
    port1.postMessage({ type: DUMP, id: 'a', files: [{ name: 'l.beancount', content: 'x' }] });

    const message = await reply;
    expect(message).toMatchObject({
      type: RESULT,
      id: 'a',
      ok: true,
      json: '{"schema":1}',
      summary: { entries: 1, errors: 0, byType: { open: 1 }, beancount: '3.2.0' },
    });
  });

  it('reports a failure as a message rather than throwing across the port', async () => {
    const { port1, port2 } = new MessageChannel();
    serveDumpRequests(
      port2,
      stubEngine({
        dump: () => Promise.reject(new Error('Syntax error on line 3')),
      }),
    );

    const reply = next(port1);
    port1.postMessage({ type: DUMP, id: 'b', files: [{ name: 'l.beancount', content: 'x' }] });

    expect(await reply).toEqual({
      type: RESULT,
      id: 'b',
      ok: false,
      error: 'Syntax error on line 3',
    });
  });

  it('ignores traffic that is not a dump request', async () => {
    const { port1, port2 } = new MessageChannel();
    const dump = vi.fn(stubEngine().dump);
    serveDumpRequests(port2, stubEngine({ dump }));

    port1.postMessage({ type: 'something-else' });
    port1.postMessage({ type: DUMP });
    port1.postMessage({ type: DUMP, id: 'c', files: [{ name: 'x', content: 42 }] });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(dump).not.toHaveBeenCalled();
  });

  it('serialises requests, since there is one interpreter behind them', async () => {
    const { port1, port2 } = new MessageChannel();
    const order: string[] = [];
    let release: (() => void) | undefined;

    serveDumpRequests(
      port2,
      stubEngine({
        dump: async (request) => {
          const name = request.files[0].name;
          order.push(`start ${name}`);
          if (name === 'slow') await new Promise<void>((resolve) => (release = resolve));
          order.push(`done ${name}`);
          return { json: '{}', document: document_(), millis: 0 };
        },
      }),
    );

    port1.start();
    port1.postMessage({ type: DUMP, id: '1', files: [{ name: 'slow', content: '' }] });
    port1.postMessage({ type: DUMP, id: '2', files: [{ name: 'fast', content: '' }] });

    await vi.waitFor(() => expect(release).toBeDefined());
    expect(order).toEqual(['start slow']);

    release!();
    await vi.waitFor(() => expect(order).toHaveLength(4));
    expect(order).toEqual(['start slow', 'done slow', 'start fast', 'done fast']);
  });

  it('loads the engine lazily, so an idle frame costs nothing', async () => {
    const { port1, port2 } = new MessageChannel();
    const create = vi.fn(() => Promise.resolve(stubEngine()));
    serveDumpRequests(port2, create);

    expect(create).not.toHaveBeenCalled();

    const reply = next(port1);
    port1.postMessage({ type: DUMP, id: 'd', files: [{ name: 'l', content: '' }] });
    await reply;

    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe('acceptConnections', () => {
  /** A stand-in for `window`; only `addEventListener`/`dispatchEvent` are used. */
  function fakeWindow(): Window & { emit: (data: unknown, origin: string, ports: MessagePort[]) => void } {
    const target = new EventTarget();
    return Object.assign(target, {
      emit(data: unknown, origin: string, ports: MessagePort[]) {
        target.dispatchEvent(new MessageEvent('message', { data, origin, ports }));
      },
    }) as never;
  }

  it('hands over the port a permitted origin sends', () => {
    const window_ = fakeWindow();
    const onPort = vi.fn();
    acceptConnections(window_, { allowed: ['https://app.example'], onPort });

    const { port2 } = new MessageChannel();
    window_.emit({ type: CONNECT, protocol: PROTOCOL_VERSION }, 'https://app.example', [port2]);

    // Identity, not equality: a MessagePort is cyclic enough to blow the stack on a deep compare.
    expect(onPort.mock.calls[0][0]).toBe(port2);
  });

  it('refuses an origin outside the allowlist', () => {
    const window_ = fakeWindow();
    const onPort = vi.fn();
    const onRefused = vi.fn();
    acceptConnections(window_, { allowed: ['https://app.example'], onPort, onRefused });

    const { port2 } = new MessageChannel();
    window_.emit({ type: CONNECT, protocol: PROTOCOL_VERSION }, 'https://evil.example', [port2]);

    expect(onPort).not.toHaveBeenCalled();
    expect(onRefused).toHaveBeenCalledWith('https://evil.example');
  });

  it('accepts any origin when no allowlist is configured', () => {
    const window_ = fakeWindow();
    const onPort = vi.fn();
    acceptConnections(window_, { allowed: [], onPort });

    const { port2 } = new MessageChannel();
    window_.emit({ type: CONNECT, protocol: PROTOCOL_VERSION }, 'https://anywhere.example', [port2]);

    expect(onPort).toHaveBeenCalledOnce();
  });
});

describe('announceReady', () => {
  it('posts at * — the embedder’s origin is not knowable from inside the frame', () => {
    const postMessage = vi.fn();
    announceReady({ postMessage } as unknown as Window, '3.2.0');

    expect(postMessage).toHaveBeenCalledWith(
      { type: READY, protocol: PROTOCOL_VERSION, beancount: '3.2.0' },
      '*',
    );
  });

  it('omits the version before the interpreter has loaded', () => {
    const postMessage = vi.fn();
    announceReady({ postMessage } as unknown as Window);

    expect(postMessage).toHaveBeenCalledWith({ type: READY, protocol: PROTOCOL_VERSION }, '*');
  });
});
