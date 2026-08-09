// Parity of the FULL generated transaction, not the DTO projection.
//
// `TransactionDTO` — what `allState.txs` carries and what Generator.spec.ts compares — is only
// {originIndex, postDate, postings}. It drops `description` and `id`. That gap is not academic:
// four transaction descriptions were wrong in the TS port (adjustments, earn/spend, the
// automatic-reinvestment leg) and every existing parity test passed, because no golden
// contained a description to disagree with. They were only caught when the beancount export
// happened to print them.
//
// Relying on beancount to be the only witness of a generator field is fragile — it puts a
// serializer between the value and the assertion, and it says nothing about fields beancount
// does not print (`id`, the system ordering counter). So compare the case class directly.

import * as fs from 'fs';
import * as path from 'path';
import { GainstrackParser } from 'src/lib/GainstrackParser';
import { buildCommands } from 'src/lib/gen/commands';
import { buildAccountState } from 'src/lib/gen/accountState';
import { GBalanceState } from 'src/lib/gen/balanceState';
import { buildBeancountCommands } from 'src/lib/gen/transactionState';
import { FIXTURE_NAMES } from 'src/lib/__tests__/fixtureNames';
import { stripScale } from 'src/lib/__tests__/scale';

const FIXTURES = path.join(__dirname, 'fixtures');

interface GoldenTx {
  id: number;
  postDate: string;
  description: string;
  postings: { account: string; value: { number: number; ccy: string }; price?: { number: number; ccy: string } }[];
}

/** The transaction stream as the generator builds it, before `toDTO` throws fields away. */
function fullTxs(text: string): GoldenTx[] {
  const parser = new GainstrackParser();
  parser.parseString(text);
  const commands = buildCommands(parser.getTypedCommands());
  const acct = buildAccountState(commands);
  const balanceState = GBalanceState.build(commands, acct);
  return buildBeancountCommands(commands, acct, balanceState)
    .filter(c => c.kind === 'tx')
    .map(c => {
      const tx = (c as { kind: 'tx'; tx: { id: number; postDate: string; description: string; postings: { toDTO(): unknown }[] } }).tx;
      return {
        id: tx.id,
        postDate: tx.postDate,
        description: tx.description,
        postings: tx.postings.map(p => p.toDTO()),
      } as GoldenTx;
    });
}

/**
 * Numbers compare by value, and rendered numbers inside descriptions lose their trailing-zero
 * scale — see `scale.ts`. Nothing else is touched; every field is otherwise compared as dumped.
 */
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, normalize(v)]),
    );
  }
  if (typeof value === 'number') return Math.round(value * 1e9) / 1e9;
  if (typeof value === 'string') return stripScale(value);
  return value;
}

describe('full transaction parity with Scala (description and id included)', () => {
  for (const name of FIXTURE_NAMES) {
    const text = () => fs.readFileSync(path.join(FIXTURES, `${name}.gainstrack`), 'utf8');
    const golden = (): GoldenTx[] => JSON.parse(fs.readFileSync(path.join(FIXTURES, `${name}.txsFull.json`), 'utf8'));

    test(`${name}: descriptions`, () => {
      // Called out separately from the whole-object comparison: a wrong description is the
      // failure this file exists for, and it should say so rather than hide in a large diff.
      expect(fullTxs(text()).map(t => stripScale(t.description)))
        .toEqual(golden().map(t => stripScale(t.description)));
    });

    test(`${name}: ids are the same sequence`, () => {
      expect(fullTxs(text()).map(t => t.id)).toEqual(golden().map(t => t.id));
    });

    test(`${name}: whole transactions`, () => {
      expect(normalize(fullTxs(text()))).toEqual(normalize(golden()));
    });

    test(`${name}: descriptions differ from Scala only in trailing zeros`, () => {
      // Bounds the normalization above. Without this, `stripScale` would also silently absorb a
      // genuinely new difference that happened to land inside a number in the same string.
      const actual = fullTxs(text());
      const gold = golden();
      expect(actual.length).toBe(gold.length);
      for (let i = 0; i < actual.length; i++) {
        if (actual[i].description === gold[i].description) continue;
        expect(stripScale(actual[i].description)).toBe(stripScale(gold[i].description));
      }
    });
  }
});
