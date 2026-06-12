import * as fs from 'fs';
import * as path from 'path';
import { generate } from 'src/lib/gen/GainstrackGenerator';

// Differential test: each case in gen_cases.txt is run through the Scala slice-1 pipeline
// (DumpGeneratorCases.scala -> gen_cases.expected.json) and the TS generator here; the
// ok/error behaviour must match. This guards generator-error parity (e.g. trade on a
// non-multiAsset account, transfer to a missing account, earn without a funding account).

const FIXTURES = path.join(__dirname, '..', '..', '__tests__', 'fixtures');

interface ExpectedCase { id: string; status: 'ok' | 'error'; }

function readCases(): { id: string; body: string }[] {
  const raw = fs.readFileSync(path.join(FIXTURES, 'gen_cases.txt'), 'utf8');
  const re = /^### id: (.+)$/gm;
  const matches = [...raw.matchAll(re)];
  return matches.map((m, i) => {
    const start = m.index! + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : raw.length;
    return { id: m[1].trim(), body: raw.slice(start, end).replace(/^\n/, '') };
  });
}

function status(body: string): 'ok' | 'error' {
  try {
    generate(body);
    return 'ok';
  } catch {
    return 'error';
  }
}

describe('GainstrackGenerator differential (TS error behaviour == Scala)', () => {
  const expected: ExpectedCase[] = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'gen_cases.expected.json'), 'utf8'));
  const byId = new Map(expected.map(e => [e.id, e]));
  const cases = readCases();

  test('corpus aligned on both sides', () => {
    expect(cases.map(c => c.id).sort()).toEqual(expected.map(e => e.id).sort());
  });

  for (const c of cases) {
    test(`${c.id}`, () => {
      expect(status(c.body)).toBe(byId.get(c.id)!.status);
    });
  }
});
