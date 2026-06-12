import * as fs from 'fs';
import * as path from 'path';
import { GainstrackParser } from 'src/lib/GainstrackParser';

// Differential test: the same corpus (parser_cases.txt) is run through the Scala parser
// (DumpParserCases.scala, which records parser_cases.expected.json) and through the TS
// parser here. For every case the behaviour must match:
//   - status: "ok" | "error" (collected ParserMessage) | "crash" (uncaught throw)
//   - and for "ok" cases, the normalized command DTOs must be identical.

const FIXTURES = path.join(__dirname, 'fixtures');

interface ExpectedCase {
  id: string;
  status: 'ok' | 'error' | 'crash';
  commands?: unknown[];
}

function readCases(): { id: string; body: string }[] {
  const raw = fs.readFileSync(path.join(FIXTURES, 'parser_cases.txt'), 'utf8');
  const re = /^### id: (.+)$/gm;
  const cases: { id: string; body: string }[] = [];
  const matches = [...raw.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const id = matches[i][1].trim();
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : raw.length;
    cases.push({ id, body: raw.slice(start, end).replace(/^\n/, '') });
  }
  return cases;
}

// Same normalization as the golden parity test: drop display-only `description`/`comments`,
// drop empty arrays and null/undefined, round numbers (Scala 34-digit vs JS 17-digit).
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize).filter(v => v !== undefined);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'description' || k === 'comments') continue;
      const nv = normalize(v);
      if (nv === undefined || nv === null) continue;
      if (Array.isArray(nv) && nv.length === 0) continue;
      out[k] = nv;
    }
    return out;
  }
  if (typeof value === 'number') return Math.round(value * 1e6) / 1e6;
  return value;
}

function run(body: string): { status: 'ok' | 'error' | 'crash'; commands?: unknown } {
  const parser = new GainstrackParser();
  try {
    parser.parseString(body);
    const commands = parser.getCommands();
    return { status: 'ok', commands };
  } catch {
    return { status: parser.parserErrors.length > 0 ? 'error' : 'crash' };
  }
}

describe('GainstrackParser differential (TS behaviour == Scala behaviour)', () => {
  const expected: ExpectedCase[] = JSON.parse(
    fs.readFileSync(path.join(FIXTURES, 'parser_cases.expected.json'), 'utf8'),
  );
  const byId = new Map(expected.map(e => [e.id, e]));
  const cases = readCases();

  test('corpus is aligned on both sides', () => {
    expect(cases.map(c => c.id).sort()).toEqual(expected.map(e => e.id).sort());
  });

  for (const c of cases) {
    test(`${c.id}`, () => {
      const exp = byId.get(c.id)!;
      const actual = run(c.body);
      if (exp.status === 'crash') {
        // Scala throws an *uncaught* error here (e.g. `???` on an unknown option key, which
        // extends Error and escapes its Exception-only catch). The TS port handles these more
        // gracefully — we only require that it also rejects the input, never silently accepts.
        expect(actual.status === 'error' || actual.status === 'crash').toBe(true);
      } else {
        expect(actual.status).toBe(exp.status);
        if (exp.status === 'ok') {
          expect(normalize(actual.commands)).toEqual(normalize(exp.commands));
        }
      }
    });
  }
});
