// The client half of the bean2gain protocol, driven against a stand-in for the converter.
//
// jsdom will not actually load a cross-origin frame, so the far side is played here: the frame's
// `postMessage` is intercepted to capture the transferred port, and `ready` is dispatched by hand.
// That is enough to exercise everything this file is responsible for — the handshake, the origin
// checks, request correlation and failure translation — none of which involve beancount.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBean2Gain, type Bean2Gain } from '../bridge';

const ORIGIN = 'https://bean2gain.test';

interface FarSide {
  /** The port the client transferred on connect. */
  port: MessagePort;
  /** Everything the client posted to the frame window. */
  posted: { message: unknown; targetOrigin: string }[];
}

/**
 * Stand in for the converter.
 *
 * Returns once the client has completed its handshake, with the port it opened — after which the
 * test can answer requests exactly as the real page would.
 */
function farSide(options: { origin?: string; source?: 'frame' | 'other' } = {}): Promise<FarSide> {
  const frame = document.querySelector('iframe');
  if (!frame) throw new Error('the client did not create a frame');

  const posted: { message: unknown; targetOrigin: string }[] = [];
  return new Promise((resolve) => {
    Object.defineProperty(frame, 'contentWindow', {
      configurable: true,
      value: {
        postMessage: (message: unknown, targetOrigin: string, transfer?: Transferable[]) => {
          posted.push({ message, targetOrigin });
          const port = transfer?.[0];
          if (port instanceof MessagePort) {
            port.start();
            resolve({ port, posted });
          }
        },
      },
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'bean2gain:ready', protocol: 1 },
        origin: options.origin ?? ORIGIN,
        source: (options.source === 'other'
          ? window
          : frame.contentWindow) as unknown as MessageEventSource,
      }),
    );
  });
}

let client: Bean2Gain | undefined;

afterEach(() => {
  client?.dispose();
  client = undefined;
  document.querySelectorAll('iframe').forEach((frame) => frame.remove());
});

describe('createBean2Gain', () => {
  it('refuses to run against our own origin', () => {
    // Same-origin would work and would also quietly dissolve the separation the whole arrangement
    // exists for, so it has to be an error rather than a warning.
    expect(() => createBean2Gain({ origin: window.location.origin })).toThrow(/different origin/);
  });

  it('opens a hidden frame at the converter, unsandboxed', () => {
    client = createBean2Gain({ origin: ORIGIN });
    const frame = document.querySelector('iframe')!;

    expect(frame.src).toBe(`${ORIGIN}/embed.html`);
    // An opaque origin would post as `null` and lose the offline cache; see the comment in bridge.ts.
    expect(frame.getAttribute('sandbox')).toBeNull();
  });

  it('connects by transferring a port to the converter’s origin', async () => {
    client = createBean2Gain({ origin: ORIGIN });
    const far = await farSide();

    expect(far.posted[0]).toMatchObject({
      message: { type: 'bean2gain:connect', protocol: 1 },
      targetOrigin: ORIGIN,
    });
  });

  it('ignores a ready message from the wrong origin', async () => {
    client = createBean2Gain({ origin: ORIGIN, timeoutMs: 50 });
    const frame = document.querySelector('iframe')!;
    const postMessage = vi.fn();
    Object.defineProperty(frame, 'contentWindow', { configurable: true, value: { postMessage } });

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'bean2gain:ready', protocol: 1 },
        origin: 'https://evil.test',
        source: frame.contentWindow as unknown as MessageEventSource,
      }),
    );

    await expect(client.ready()).rejects.toThrow(/did not respond/);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('ignores a ready message from another frame on the right origin', async () => {
    client = createBean2Gain({ origin: ORIGIN, timeoutMs: 50 });
    const frame = document.querySelector('iframe')!;
    const postMessage = vi.fn();
    Object.defineProperty(frame, 'contentWindow', { configurable: true, value: { postMessage } });

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'bean2gain:ready', protocol: 1 },
        origin: ORIGIN,
        source: window as unknown as MessageEventSource,
      }),
    );

    await expect(client.ready()).rejects.toThrow(/did not respond/);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('returns the document text and summary the converter sends back', async () => {
    client = createBean2Gain({ origin: ORIGIN });
    const far = await farSide();

    far.port.onmessage = (event: MessageEvent) => {
      const request = event.data as { id: string; files: { name: string }[]; entry?: string };
      expect(request.files).toEqual([{ name: 'l.beancount', content: 'x' }]);
      expect(request.entry).toBe('l.beancount');
      far.port.postMessage({
        type: 'bean2gain:result',
        id: request.id,
        ok: true,
        json: '{"schema":1,"entries":[]}',
        summary: { entries: 0, errors: 0, byType: {}, millis: 3, beancount: '3.2.0' },
      });
    };

    const result = await client.convert([{ name: 'l.beancount', content: 'x' }], {
      entry: 'l.beancount',
    });

    expect(result.json).toBe('{"schema":1,"entries":[]}');
    expect(result.summary.beancount).toBe('3.2.0');
  });

  it('turns a reported failure into a rejection', async () => {
    client = createBean2Gain({ origin: ORIGIN });
    const far = await farSide();

    far.port.onmessage = (event: MessageEvent) => {
      far.port.postMessage({
        type: 'bean2gain:result',
        id: (event.data as { id: string }).id,
        ok: false,
        error: 'Syntax error on line 3',
      });
    };

    await expect(client.convert([{ name: 'l.beancount', content: 'x' }])).rejects.toThrow(
      'Syntax error on line 3',
    );
  });

  it('matches answers to requests by id, in whatever order they arrive', async () => {
    client = createBean2Gain({ origin: ORIGIN });
    const far = await farSide();

    const seen: string[] = [];
    far.port.onmessage = (event: MessageEvent) => {
      seen.push((event.data as { id: string }).id);
      // Answer the second request first: the converter is free to, and correlation by id is the
      // only thing standing between that and a caller getting somebody else's ledger back.
      if (seen.length === 2) {
        for (const id of [seen[1], seen[0]]) {
          far.port.postMessage({
            type: 'bean2gain:result',
            id,
            ok: true,
            json: `{"id":"${id}"}`,
            summary: { entries: 0, errors: 0, byType: {}, millis: 0, beancount: '3.2.0' },
          });
        }
      }
    };

    const [first, second] = await Promise.all([
      client.convert([{ name: 'a.beancount', content: '' }]),
      client.convert([{ name: 'b.beancount', content: '' }]),
    ]);

    expect(first.json).toBe(`{"id":"${seen[0]}"}`);
    expect(second.json).toBe(`{"id":"${seen[1]}"}`);
  });

  it('removes the frame and stops listening when disposed', async () => {
    client = createBean2Gain({ origin: ORIGIN });
    await farSide();

    client.dispose();
    client = undefined;

    expect(document.querySelector('iframe')).toBeNull();
  });
});
