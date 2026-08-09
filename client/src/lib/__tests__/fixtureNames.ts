/**
 * The checked-in synthetic ledgers every golden parity spec runs over.
 *
 * One list, because a fixture missing from one spec is a hole nobody notices. Mirrors
 * `core/src/test/scala/com/gainstrack/core/test/Fixtures.scala`, which drives the dumps — keep
 * the two in step. `fixtureNames.spec.ts` asserts every name here actually has its goldens.
 */
export const FIXTURE_NAMES = [
  'basic', 'unit', 'src', 'div', 'balbug', 'james', 'noequity', 'multiadj', 'kitchensink',
] as const;
