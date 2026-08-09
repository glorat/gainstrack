// A seeded generator of random-but-VALID gainstrack ledgers, for differential testing against
// the Scala oracle.
//
// Why valid rather than purely random text: the interesting parity surface is the generator's
// success path — account interpolation, multi-asset sub-account routing, reinvestment legs, FX
// chains. Random text overwhelmingly fails at the parser, so a naive fuzzer would spend all its
// budget re-testing error handling and never reach any of that. So this models the language's
// rules — which accounts exist, which are multiAsset, what a yield may name — and only emits
// commands that are legal in the current state.
//
// Invalid ledgers still matter, so `mutate()` corrupts a valid one in a targeted way. Those
// exercise error parity, where the two implementations are least likely to agree.
//
// Determinism is the point: the same seed must produce the same ledger on every machine and
// every run, because the Scala goldens are dumped from the files this writes. Hence the explicit
// PRNG rather than Math.random (which the workflow sandbox also forbids).

/** Mulberry32 — small, fast, and identical across platforms. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Rand {
  next: () => number;
  int: (lo: number, hi: number) => number;
  pick: <T>(xs: readonly T[]) => T;
  chance: (p: number) => boolean;
  amount: (lo: number, hi: number) => string;
}

function makeRand(seed: number): Rand {
  const next = rng(seed);
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  return {
    next,
    int,
    pick: <T,>(xs: readonly T[]): T => xs[int(0, xs.length - 1)],
    chance: (p: number) => next() < p,
    // Deliberately varied decimal places: scale is where TS and Scala money differ, so the
    // corpus should contain integers, 2dp and 4dp rather than one uniform shape.
    amount: (lo: number, hi: number) => {
      const v = lo + next() * (hi - lo);
      return v.toFixed(int(0, 2) === 0 ? 0 : int(2, 4));
    },
  };
}

const CCYS = ['USD', 'GBP', 'HKD', 'EUR', 'SGD'] as const;
const ASSETS = ['VWRL', 'IVV', 'VTI', 'FTSE', 'BRK-B', 'VCSH'] as const;
const INCOME_TAGS = ['Salary', 'Bonus', 'Interest'] as const;
const EXPENSE_TAGS = ['Food', 'Rent', 'Travel'] as const;

interface Account {
  id: string;
  ccy: string;
  multiAsset: boolean;
  automaticReinvestment: boolean;
  fundingAccount?: string;
}

interface Line { date: string; text: string }

class Builder {
  readonly accounts: Account[] = [];
  readonly lines: Line[] = [];
  /** Assets actually held per multiAsset account — a yield may only name one of these. */
  readonly holdings = new Map<string, Set<string>>();
  private day = 0;

  constructor(readonly r: Rand, readonly baseCcy: string) {}

  /** Dates advance monotonically; the parser sorts anyway, but this keeps ledgers readable. */
  nextDate(): string {
    this.day += this.r.int(1, 40);
    const d = new Date(Date.UTC(2010, 0, 1) + this.day * 86400000);
    return d.toISOString().slice(0, 10);
  }

  emit(date: string, text: string): void {
    this.lines.push({ date, text });
  }

  find(id: string): Account | undefined {
    return this.accounts.find(a => a.id === id);
  }

  of(pred: (a: Account) => boolean): Account[] {
    return this.accounts.filter(pred);
  }

  open(a: Account, date: string): void {
    this.accounts.push(a);
    const opts: string[] = [];
    if (a.multiAsset) opts.push('  multiAsset: true');
    if (a.automaticReinvestment) opts.push('  automaticReinvestment: true');
    if (a.fundingAccount) opts.push(`  fundingAccount: ${a.fundingAccount}`);
    this.emit(date, [`${date} open ${a.id} ${a.ccy}`, ...opts].join('\n'));
    if (a.multiAsset) this.holdings.set(a.id, new Set());
  }

  text(): string {
    const header = this.baseCcy === 'USD' ? [] : [`option "operating_currency" "${this.baseCcy}"`];
    return [...header, ...this.lines.map(l => l.text)].join('\n') + '\n';
  }
}

/** Open a plausible chart of accounts. Everything later depends on what exists here. */
function openChart(b: Builder): void {
  const d0 = b.nextDate();
  b.open({ id: 'Equity:Opening', ccy: b.baseCcy, multiAsset: true, automaticReinvestment: false }, d0);

  const banks = b.r.int(1, 3);
  for (let i = 0; i < banks; i++) {
    b.open({
      id: `Assets:Bank:B${i}`,
      ccy: b.r.chance(0.6) ? b.baseCcy : b.r.pick(CCYS),
      multiAsset: false,
      automaticReinvestment: false,
      fundingAccount: 'Equity:Opening',
    }, b.nextDate());
  }

  const brokers = b.r.int(1, 2);
  for (let i = 0; i < brokers; i++) {
    const funding = b.r.pick(b.of(a => a.id.startsWith('Assets:Bank'))).id;
    b.open({
      id: `Assets:Broker:B${i}`,
      ccy: b.r.chance(0.7) ? b.baseCcy : b.r.pick(CCYS),
      multiAsset: true,
      // automaticReinvestment adds the second transfer leg — a known past bug site, so weight
      // it high enough that a good share of ledgers exercise it.
      automaticReinvestment: b.r.chance(0.4),
      fundingAccount: funding,
    }, b.nextDate());
  }

  const bank = () => b.r.pick(b.of(a => a.id.startsWith('Assets:Bank'))).id;
  for (const tag of INCOME_TAGS) {
    if (b.r.chance(0.7)) {
      b.open({ id: `Income:${tag}`, ccy: b.baseCcy, multiAsset: false, automaticReinvestment: false, fundingAccount: bank() }, b.nextDate());
    }
  }
  for (const tag of EXPENSE_TAGS) {
    if (b.r.chance(0.7)) {
      b.open({ id: `Expenses:${tag}`, ccy: b.baseCcy, multiAsset: false, automaticReinvestment: false, fundingAccount: bank() }, b.nextDate());
    }
  }
  if (b.r.chance(0.5)) {
    b.open({ id: 'Liabilities:Card', ccy: b.baseCcy, multiAsset: false, automaticReinvestment: false, fundingAccount: bank() }, b.nextDate());
  }
}

type Action = (b: Builder, date: string) => boolean;

/**
 * Each action returns false when the current state makes it illegal, so the caller can retry a
 * different one. This is what keeps the corpus on the success path.
 */
const ACTIONS: Action[] = [
  // fund
  (b, date) => {
    const targets = b.of(a => a.id.startsWith('Assets'));
    if (!targets.length) return false;
    const t = b.r.pick(targets);
    const src = b.r.chance(0.4) ? ` ${b.r.pick(b.of(a => a.id !== t.id)).id}` : '';
    b.emit(date, `${date} fund ${t.id}${src} ${b.r.amount(100, 20000)} ${t.ccy}`);
    return true;
  },
  // earn — bare tag, or with an explicit target account
  (b, date) => {
    const incomes = b.of(a => a.id.startsWith('Income:'));
    if (!incomes.length) return false;
    const inc = b.r.pick(incomes);
    const tag = inc.id.slice('Income:'.length);
    const target = b.r.chance(0.3) ? ` ${b.r.pick(b.of(a => a.id.startsWith('Assets:Bank'))).id}` : '';
    b.emit(date, `${date} earn ${b.r.chance(0.5) ? tag : inc.id}${target} ${b.r.amount(50, 9000)} ${inc.ccy}`);
    return true;
  },
  // spend
  (b, date) => {
    const exps = b.of(a => a.id.startsWith('Expenses:'));
    if (!exps.length) return false;
    const e = b.r.pick(exps);
    const tag = e.id.slice('Expenses:'.length);
    const other = b.r.chance(0.3) ? ` ${b.r.pick(b.of(a => a.id.startsWith('Assets:Bank'))).id}` : '';
    b.emit(date, `${date} spend ${b.r.chance(0.5) ? tag : e.id}${other} ${b.r.amount(5, 900)} ${e.ccy}`);
    return true;
  },
  // tfr — same currency, or cross-currency with an explicit target leg
  (b, date) => {
    if (b.accounts.length < 2) return false;
    const src = b.r.pick(b.of(a => a.id.startsWith('Assets') || a.id.startsWith('Equity')));
    const dst = b.r.pick(b.of(a => a.id !== src.id));
    const amt = b.r.amount(10, 5000);
    if (src.ccy === dst.ccy || b.r.chance(0.5)) {
      b.emit(date, `${date} tfr ${src.id} ${dst.id} ${amt} ${src.ccy}`);
    } else {
      b.emit(date, `${date} tfr ${src.id} ${dst.id} ${amt} ${src.ccy} ${b.r.amount(10, 5000)} ${dst.ccy}`);
    }
    return true;
  },
  // trade — buy, or sell something already held
  (b, date) => {
    const brokers = b.of(a => a.multiAsset && a.id.startsWith('Assets:Broker'));
    if (!brokers.length) return false;
    const br = b.r.pick(brokers);
    const held = [...(b.holdings.get(br.id) ?? [])];
    const sell = held.length > 0 && b.r.chance(0.3);
    const asset = sell ? b.r.pick(held) : b.r.pick(ASSETS);
    const qty = sell ? `-${b.r.int(1, 20)}` : `${b.r.int(1, 200)}`;
    const comm = b.r.chance(0.4) ? ` C${b.r.amount(1, 20)} ${br.ccy}` : '';
    b.emit(date, `${date} trade ${br.id} ${qty} ${asset} @${b.r.amount(1, 500)} ${br.ccy}${comm}`);
    if (!sell) b.holdings.get(br.id)!.add(asset);
    return true;
  },
  // unit — a holdings statement on a multiAsset account
  (b, date) => {
    const brokers = b.of(a => a.multiAsset && a.id.startsWith('Assets:Broker'));
    if (!brokers.length) return false;
    const br = b.r.pick(brokers);
    const asset = b.r.pick(ASSETS);
    b.emit(date, `${date} unit ${br.id} ${b.r.int(1, 500)} ${asset} @${b.r.amount(1, 400)} ${br.ccy}`);
    b.holdings.get(br.id)!.add(asset);
    return true;
  },
  // yield — must name a held asset on a multiAsset account, and must NOT on any other
  (b, date) => {
    if (b.r.chance(0.5)) {
      const withHoldings = b.of(a => a.multiAsset && (b.holdings.get(a.id)?.size ?? 0) > 0);
      if (!withHoldings.length) return false;
      const acct = b.r.pick(withHoldings);
      const asset = b.r.pick([...b.holdings.get(acct.id)!]);
      b.emit(date, `${date} yield ${acct.id} ${asset} ${b.r.amount(1, 200)} ${acct.ccy}`);
    } else {
      const plain = b.of(a => !a.multiAsset && a.id.startsWith('Assets'));
      if (!plain.length) return false;
      const acct = b.r.pick(plain);
      b.emit(date, `${date} yield ${acct.id} ${b.r.amount(1, 200)} ${acct.ccy}`);
    }
    return true;
  },
  // adj
  (b, date) => {
    const accts = b.of(a => a.id.startsWith('Assets') && !a.multiAsset);
    if (!accts.length) return false;
    const a = b.r.pick(accts);
    b.emit(date, `${date} adj ${a.id} ${b.r.amount(-2000, 30000)} ${a.ccy} Equity:Opening`);
    return true;
  },
  // bal
  (b, date) => {
    const accts = b.of(x => x.id.startsWith('Assets') && !x.multiAsset);
    if (!accts.length) return false;
    const a = b.r.pick(accts);
    b.emit(date, `${date} bal ${a.id} ${b.r.amount(0, 30000)} ${a.ccy} Equity:Opening`);
    return true;
  },
  // price
  (b, date) => {
    b.emit(date, `${date} price ${b.r.pick(ASSETS)} ${b.r.amount(1, 500)} ${b.r.pick(CCYS)}`);
    return true;
  },
];

/** Build one valid-by-construction ledger. */
export function generateLedger(seed: number): string {
  const r = makeRand(seed);
  const b = new Builder(r, r.pick(CCYS));

  if (r.chance(0.5)) {
    const asset = r.pick(ASSETS);
    b.emit('1900-01-01', [`1900-01-01 commodity ${asset}`, `  name: ${asset} Fund`, '  tags: equity,global', `  ticker: ${asset}.X`].join('\n'));
  }

  openChart(b);

  const events = r.int(5, 40);
  for (let i = 0; i < events; i++) {
    const date = b.nextDate();
    // Try a few actions before giving up on this slot, so an unlucky pick doesn't shorten
    // the ledger.
    for (let attempt = 0; attempt < 5; attempt++) {
      if (r.pick(ACTIONS)(b, date)) break;
    }
  }
  return b.text();
}

/**
 * Corrupt a valid ledger in one targeted way, to probe ERROR parity.
 *
 * Targeted rather than random bit-flips: the goal is inputs that are wrong in the ways real
 * ledgers are wrong (a typo'd account, a missing field, a bad date), because those reach deeper
 * into the pipeline than noise does.
 */
export function mutate(text: string, seed: number): string {
  const r = makeRand(seed ^ 0x5bf03635);
  const lines = text.split('\n').filter(l => l.trim() !== '');
  if (!lines.length) return text;
  const i = r.int(0, lines.length - 1);
  const line = lines[i];
  const mutations: ((s: string) => string)[] = [
    s => s.replace(/Assets:\S+/, 'Assets:DoesNotExist'),
    s => s.replace(/\d{4}-\d{2}-\d{2}/, '2019-13-45'),
    s => s.replace(/ [A-Z]{3}\b/, ' ZZZ'),
    s => s.split(' ').slice(0, -1).join(' '),
    s => `${s} extraTokenHere`,
    s => s.replace(/\d+(\.\d+)?/, 'notanumber'),
    s => s.replace(/^(\d{4}-\d{2}-\d{2}) \w+/, '$1 frobnicate'),
    s => s.replace(/@/, ''),
  ];
  lines[i] = r.pick(mutations)(line);
  return lines.join('\n') + '\n';
}
