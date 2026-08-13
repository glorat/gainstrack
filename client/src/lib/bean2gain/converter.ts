// Where the converter lives, and the one instance of it this application keeps.
//
// The frame holds a loaded CPython, which costs seconds to start. Creating it per import would
// pay that every time, so the instance is cached — and created lazily, because a user who never
// imports should never fetch an interpreter.

import { Bean2Gain, createBean2Gain } from './bridge';

/**
 * The GPL-2.0-only converter, on its own origin. That separation is the whole arrangement — see
 * the Licensing section of the repository README — so this is a constant rather than something
 * configurable to a same-origin path. `createBean2Gain` refuses same-origin anyway.
 *
 * `bean2gain.gainstrack.com` will point here once DNS is set up; changing this line is the whole
 * migration, since the frame is addressed by origin and nothing else.
 */
export const BEAN2GAIN_ORIGIN = 'https://bean2gain.web.app';

let instance: Bean2Gain | undefined;

/** The shared converter, started on first use. */
export function getConverter(): Bean2Gain {
  return (instance ??= createBean2Gain({ origin: BEAN2GAIN_ORIGIN }));
}

/** Drop the frame and the interpreter inside it. The next call starts a fresh one. */
export function disposeConverter(): void {
  instance?.dispose();
  instance = undefined;
}
