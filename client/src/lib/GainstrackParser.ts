// Port of the Scala `com.gainstrack.command.GainstrackParser` (+ the 12 command
// grammars and their `toDTO` mappings) to TypeScript.
//
// Goal: take gainstrack DSL text and produce the same `AccountCommandDTO[]` the Scala
// server returns in `AllState.commands` (i.e. `originalCommands.map(_.toDTO)`), including
// the same `sorted` ordering and merge-conflict detection.
//
// Numbers are plain JS `number` (matching the existing client `Amount` shape); exact
// decimal arithmetic is out of scope here (no math happens in the parser). Derived display
// strings (`description`) reproduce the Scala templates on a best-effort basis only.

import { LocalDate } from '@js-joda/core';
import { AccountCommandDTO, Amount } from 'src/lib/assetdb/models';

// Display `description` and a couple of derived fields read known-present amounts.

export interface ParserMessage {
  message: string;
  line: number;
  input: string;
}

// Scala `MinDate = java.time.LocalDate.MIN` (year -999999999). js-joda cannot represent it,
// so we treat it as a literal/sentinel for the GlobalCommand.
const MIN_DATE = '-999999999-01-01';

// Shared regex fragments (mirrors command/Patterns.scala)
const DATE = String.raw`(\d{4}-\d{2}-\d{2})`;
const ACCT = String.raw`(\S+)`;
const ASSET = String.raw`([A-Z][A-Z0-9-]+)`;
const BAL = String.raw`(\S+ \S+)`; // "<number> <CCY>" captured as one group

const ACCOUNT_COMMAND_RE = new RegExp(`^${DATE} (\\w+).*`);
const METADATA_RE = /^\s*([a-z][A-Za-z0-9_-]+):\s*(.*)$/;
const OPTION_RE = /^option "([a-z][A-Za-z0-9_-]+)" "(.*)"$/;
const COMMENT_RE = /^[;#]\s?(.*)$/;
const IGNORE_RE = /^\w*$/; // matches blank lines and bare single words (mirrors Scala)

type Kind =
  | 'open' | 'earn' | 'spend' | 'tfr' | 'trade' | 'adj' | 'bal'
  | 'price' | 'unit' | 'fund' | 'yield' | 'commodity' | 'close' | 'global';

// Where `close` books the period's income and expenses when the command names no account.
export const RETAINED_EARNINGS_ID = 'Equity:RetainedEarnings';

// DTO fields whose numeric literal is echoed back in a `description` template.
type RawField = 'change' | 'balance' | 'price' | 'commission';

export interface Parsed {
  kind: Kind;
  dto: AccountCommandDTO;
  // The `tfr` DTO only stores the fx-rate `price` in the SOURCE ccy, so the target amount is
  // not recoverable from the DTO. Carry it here for the generator (does not affect DTO output).
  tfrTarget?: Amount;
  // Numeric literals exactly as written in the source. Scala renders `description` from
  // `BigDecimal.toPlainString`, which preserves the literal's scale ("2000.00", "265000.0"),
  // so display parity needs the original text rather than the parsed JS number.
  raws?: Partial<Record<RawField, string>>;
  // earn/spend echo the tag exactly as written (Scala `incomeTag`/`expenseTag`), which is not
  // recoverable from `accountId` — "Income:Salary" and "Salary" both yield accountId
  // "Income:Salary" but print differently.
  tag?: string;
}

export type { Kind };

// ---- helpers ---------------------------------------------------------------

function plainNumber(n: number): string {
  // Best-effort plain (non-exponential) rendering, used only for display `description`.
  if (Number.isInteger(n)) return String(n);
  const s = String(n);
  if (!s.includes('e') && !s.includes('E')) return s;
  return n.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
}

// Scala prints `Amount` as `${number.bigDecimal.toPlainString} ${ccy}`, so the scale of the
// source literal survives. Prefer the raw text when we still have it.
function amtStr(a: Amount, raw?: string): string {
  return `${raw ?? plainNumber(a.number)} ${a.ccy}`;
}

// The numeric half of a "<number> <CCY>" capture.
function numOf(balStr: string): string {
  return balStr.slice(0, balStr.indexOf(' '));
}

function shortName(accountId: string): string {
  const parts = accountId.split(':');
  return parts[parts.length - 1] ?? accountId;
}

class ParseError extends Error {}

const ACCOUNT_TYPES = new Set(['Assets', 'Liabilities', 'Equity', 'Income', 'Expenses']);

// Mirrors `AccountId.accountType` -> `AccountType.apply`: the segment before the first ':'
// must name a known account type ('' being the root). Scala throws IllegalArgumentException,
// which `GainstrackParser` collects as a parser error.
function accountType(accountId: string): string {
  const prefix = accountId.split(':')[0];
  if (prefix !== '' && !ACCOUNT_TYPES.has(prefix)) {
    throw new ParseError(`${prefix} is not an account type`);
  }
  return prefix;
}

// `SecurityPurchase` and `UnitTrustBalance` both open with `require(accountId.accountType == Assets)`.
function requireAssetsAccount(accountId: string): void {
  if (accountType(accountId) !== 'Assets') {
    throw new ParseError(`requirement failed: ${accountId} is not an Assets account`);
  }
}

// Parse "<number> <CCY>" into an Amount (mirrors Amount.parse + parseNumber/AssetId).
function parseAmount(str: string): Amount {
  const m = /^(\S+) (\S+)$/.exec(str);
  if (!m) throw new ParseError(`Cannot parse amount: ${str}`);
  const number = Number(m[1]);
  if (Number.isNaN(number)) throw new ParseError(`Not a number: ${m[1]}`);
  const ccy = m[2];
  if (ccy.toUpperCase() !== ccy) throw new ParseError(`Asset id must be all caps: ${ccy}`);
  return { number, ccy };
}

// ---- per-command grammars --------------------------------------------------
// Each returns the partial DTO (without commandType/description). The dispatcher
// then autofills commandType + description (mirrors AccountCommand.toDTO = toPartialDTO.autoFill).

function defaultAccountOptions(): Record<string, unknown> {
  return {
    tradingAccount: false,
    description: '',
    multiAsset: false,
    automaticReinvestment: false,
    generatedAccount: false,
    hidden: false,
    placeholder: false,
  };
}

const COMMANDS: Record<string, (line: string) => Parsed> = {
  open(line) {
    const m = new RegExp(`^${DATE} open ${ACCT} (\\S+)$`).exec(line);
    if (!m) throw new ParseError('open command cannot be parsed');
    const [, date, accountId, ccy] = m;
    if (ccy.toUpperCase() !== ccy) throw new ParseError(`Asset id must be all caps: ${ccy}`);
    accountType(accountId); // AccountKey validates the account type on construction
    return {
      kind: 'open',
      dto: { accountId, date, balance: { number: 0, ccy }, options: defaultAccountOptions() },
    };
  },

  earn(line) {
    const long = new RegExp(`^${DATE} earn ${ACCT} ${ACCT} ${BAL}$`).exec(line);
    const short = long ? null : new RegExp(`^${DATE} earn ${ACCT} ${BAL}$`).exec(line);
    if (long) {
      const [, date, tag, tgt, value] = long;
      return { kind: 'earn', dto: incomeDto(date, tag, parseAmount(value), tgt), tag, raws: { change: numOf(value) } };
    }
    if (short) {
      const [, date, tag, value] = short;
      return { kind: 'earn', dto: incomeDto(date, tag, parseAmount(value)), tag, raws: { change: numOf(value) } };
    }
    throw new ParseError('earn command cannot be parsed');
  },

  spend(line) {
    const long = new RegExp(`^${DATE} spend ${ACCT} ${ACCT} ${BAL}$`).exec(line);
    const short = long ? null : new RegExp(`^${DATE} spend ${ACCT} ${BAL}$`).exec(line);
    if (long) {
      const [, date, tag, other, value] = long;
      return { kind: 'spend', dto: expenseDto(date, tag, parseAmount(value), other), tag, raws: { change: numOf(value) } };
    }
    if (short) {
      const [, date, tag, value] = short;
      return { kind: 'spend', dto: expenseDto(date, tag, parseAmount(value)), tag, raws: { change: numOf(value) } };
    }
    throw new ParseError('spend command cannot be parsed');
  },

  tfr(line) {
    const fx = new RegExp(`^${DATE} tfr ${ACCT} ${ACCT} ${BAL} ${BAL}$`).exec(line);
    const simple = fx ? null : new RegExp(`^${DATE} tfr ${ACCT} ${ACCT} ${BAL}$`).exec(line);
    if (fx) {
      const [, date, src, dst, sv, tv] = fx;
      const target = parseAmount(tv);
      return {
        kind: 'tfr', dto: tfrDto(date, src, dst, parseAmount(sv), target),
        tfrTarget: target, raws: { change: numOf(sv) },
      };
    }
    if (simple) {
      const [, date, src, dst, v] = simple;
      const amt = parseAmount(v);
      return { kind: 'tfr', dto: tfrDto(date, src, dst, amt, amt), tfrTarget: amt, raws: { change: numOf(v) } };
    }
    throw new ParseError('tfr command cannot be parsed');
  },

  trade(line) {
    const withComm = new RegExp(`^${DATE} trade ${ACCT} ${BAL} @${BAL} C${BAL}$`).exec(line);
    const basic = withComm ? null : new RegExp(`^${DATE} trade ${ACCT} ${BAL} @${BAL}$`).exec(line);
    if (withComm) {
      const [, date, acct, sec, cost, comm] = withComm;
      return {
        kind: 'trade', dto: tradeDto(date, acct, parseAmount(sec), parseAmount(cost), parseAmount(comm)),
        raws: { change: numOf(sec), price: numOf(cost), commission: numOf(comm) },
      };
    }
    if (basic) {
      const [, date, acct, sec, cost] = basic;
      const price = parseAmount(cost);
      return {
        kind: 'trade', dto: tradeDto(date, acct, parseAmount(sec), price, { number: 0, ccy: price.ccy }),
        raws: { change: numOf(sec), price: numOf(cost) },
      };
    }
    throw new ParseError('trade command cannot be parsed');
  },

  adj(line) {
    const m = new RegExp(`^${DATE} adj ${ACCT} ${BAL} ${ACCT}$`).exec(line);
    if (!m) throw new ParseError('adj command cannot be parsed');
    const [, date, acct, balance, adjAcct] = m;
    return {
      kind: 'adj', dto: { accountId: acct, date, balance: parseAmount(balance), otherAccount: adjAcct },
      raws: { balance: numOf(balance) },
    };
  },

  bal(line) {
    const m = new RegExp(`^${DATE} bal ${ACCT} ${BAL} ${ACCT}$`).exec(line);
    if (!m) throw new ParseError('bal command cannot be parsed');
    const [, date, acct, balance, adjAcct] = m;
    return {
      kind: 'bal', dto: { accountId: acct, date, balance: parseAmount(balance), otherAccount: adjAcct },
      raws: { balance: numOf(balance) },
    };
  },

  price(line) {
    const m = new RegExp(`^${DATE} price (\\S+) ${BAL}$`).exec(line);
    if (!m) throw new ParseError('price command cannot be parsed');
    const [, date, assetId, price] = m;
    if (assetId.toUpperCase() !== assetId) throw new ParseError(`Asset id must be all caps: ${assetId}`);
    return {
      kind: 'price', dto: { accountId: '', date, asset: assetId, price: parseAmount(price) },
      raws: { price: numOf(price) },
    };
  },

  unit(line) {
    const m = new RegExp(`^${DATE} unit ${ACCT} ${BAL} @${BAL}$`).exec(line);
    if (!m) throw new ParseError('unit command cannot be parsed');
    const [, date, acct, sec, price] = m;
    const dto = { accountId: acct, date, balance: parseAmount(sec), price: parseAmount(price) };
    requireAssetsAccount(acct);
    return { kind: 'unit', dto, raws: { balance: numOf(sec), price: numOf(price) } };
  },

  fund(line) {
    const long = new RegExp(`^${DATE} fund ${ACCT} ${ACCT} ${BAL}$`).exec(line);
    const simple = long ? null : new RegExp(`^${DATE} fund ${ACCT} ${BAL}$`).exec(line);
    if (long) {
      const [, date, tgt, fundAcct, value] = long;
      return {
        kind: 'fund', dto: { accountId: tgt, date, change: parseAmount(value), otherAccount: fundAcct },
        raws: { change: numOf(value) },
      };
    }
    if (simple) {
      const [, date, tgt, value] = simple;
      return {
        kind: 'fund', dto: { accountId: tgt, date, change: parseAmount(value) },
        raws: { change: numOf(value) },
      };
    }
    throw new ParseError('fund command cannot be parsed');
  },

  yield(line) {
    const withAsset = new RegExp(`^${DATE} yield ${ACCT} ${ASSET} ${BAL}$`).exec(line);
    const simple = withAsset ? null : new RegExp(`^${DATE} yield ${ACCT} ${BAL}$`).exec(line);
    if (withAsset) {
      const [, date, acct, asset, value] = withAsset;
      return {
        kind: 'yield', dto: { accountId: acct, date, asset, change: parseAmount(value) },
        raws: { change: numOf(value) },
      };
    }
    if (simple) {
      const [, date, acct, value] = simple;
      return {
        kind: 'yield', dto: { accountId: acct, date, change: parseAmount(value) },
        raws: { change: numOf(value) },
      };
    }
    throw new ParseError('yield command cannot be parsed');
  },

  close(line) {
    // `<date> close [<equityAccount>]` — closes income and expenses to retained earnings.
    const withAcct = new RegExp(`^${DATE} close ${ACCT}$`).exec(line);
    const bare = withAcct ? null : new RegExp(`^${DATE} close$`).exec(line);
    if (withAcct) {
      const [, date, accountId] = withAcct;
      if (accountId !== 'Equity' && !accountId.startsWith('Equity:')) {
        throw new ParseError(`close must book to an Equity account, got ${accountId}`);
      }
      return { kind: 'close', dto: { accountId, date } };
    }
    if (bare) {
      const [, date] = bare;
      return { kind: 'close', dto: { accountId: RETAINED_EARNINGS_ID, date } };
    }
    throw new ParseError('close command cannot be parsed');
  },

  commodity(line) {
    const m = new RegExp(`^${DATE} commodity ${ASSET}$`).exec(line);
    if (!m) throw new ParseError('commodity command cannot be parsed');
    const [, date, asset] = m;
    return {
      kind: 'commodity',
      dto: { accountId: '', date, asset, options: { name: '', ticker: '', tags: [] } },
    };
  },
};

function incomeDto(date: string, tag: string, value: Amount, target?: string): AccountCommandDTO {
  const accountId = tag.startsWith('Income:') ? tag : `Income:${tag}`;
  const dto: AccountCommandDTO = { accountId, date, change: value };
  if (target) dto.otherAccount = target;
  return dto;
}

function expenseDto(date: string, tag: string, value: Amount, other?: string): AccountCommandDTO {
  const accountId = tag.startsWith('Expenses:') ? tag : `Expenses:${tag}`;
  const dto: AccountCommandDTO = { accountId, date, change: value };
  if (other) dto.otherAccount = other;
  return dto;
}

function tfrDto(date: string, src: string, dst: string, sv: Amount, tv: Amount): AccountCommandDTO {
  // Mirrors Transfer.apply: both legs must be non-zero, and a same-ccy transfer must match.
  if (sv.number === 0 || tv.number === 0) throw new ParseError('Transfer amount must be non-zero');
  if (sv.ccy === tv.ccy && sv.number !== tv.number) {
    throw new ParseError('Single transfer amount must match (until fees supported');
  }
  const fxRate = tv.number / sv.number;
  return { accountId: src, date, change: sv, price: { number: fxRate, ccy: sv.ccy }, otherAccount: dst };
}

function tradeDto(date: string, acct: string, security: Amount, price: Amount, commission: Amount): AccountCommandDTO {
  requireAssetsAccount(acct);
  return { accountId: acct, date, change: security, price, commission };
}

// ---- description (display only; reproduces Scala templates best-effort) -----

function describe(p: Parsed): string {
  const d = p.dto;
  const r = p.raws ?? {};
  switch (p.kind) {
    case 'open': return 'Account opened';
    case 'earn': return `Earn ${amtStr(d.change!, r.change)} ${p.tag}`;
    case 'spend': return `Spend ${amtStr(d.change!, r.change)} ${p.tag}`;
    case 'tfr': {
      // Scala compares the SOURCE and TARGET currencies; `price.ccy` is always the source ccy,
      // so the target has to come from `tfrTarget`.
      const inv = d.change!.ccy === p.tfrTarget!.ccy ? '' : `@${(1 / d.price!.number).toFixed(6)}`;
      return `Transfer ${amtStr(d.change!, r.change)} ${d.accountId} -> ${d.otherAccount}${inv}`;
    }
    case 'trade':
      return `${d.change!.number > 0 ? 'BUY' : 'SELL'} ${amtStr(d.change!, r.change)} @${amtStr(d.price!, r.price)}`;
    case 'adj': return `Account balance ${amtStr(d.balance!, r.balance)}`;
    case 'bal': return `Account balance ${amtStr(d.balance!, r.balance)}`;
    case 'price': return `${d.price!.ccy}/${d.asset} = ${amtStr(d.price!, r.price)}`;
    case 'unit': return `Unit statement: ${amtStr(d.balance!, r.balance)} @${amtStr(d.price!, r.price)}`;
    case 'fund': return `Fund ${amtStr(d.change!, r.change)}`;
    case 'yield': {
      const assetAcct = d.asset ? `${d.accountId}:${d.asset}` : d.accountId;
      return `${shortName(assetAcct)} yield ${amtStr(d.change!, r.change)}`;
    }
    case 'commodity': return d.asset ?? '';
    case 'close': return `Close income and expenses to ${d.accountId}`;
    case 'global': return 'global configuration';
  }
}

// ---- option/metadata application -------------------------------------------

function stringToBool(valueStr: string): boolean {
  return valueStr !== 'false';
}

// Apply an indented `key: value` metadata line to the last command (mirrors withOption).
function applyOption(p: Parsed, key: string, value: string): void {
  if (p.kind === 'open') {
    const opts = p.dto.options as Record<string, unknown>;
    switch (key) {
      case 'expenseAccount': opts.expenseAccount = value; break;
      case 'incomeAccount': opts.incomeAccount = value; break;
      case 'fundingAccount': opts.fundingAccount = value; break;
      case 'multiAsset': opts.multiAsset = stringToBool(value); break;
      case 'automaticReinvestment': opts.automaticReinvestment = stringToBool(value); break;
      default: throw new ParseError(`Unknown account option: ${key}`);
    }
  } else if (p.kind === 'commodity') {
    const opts = p.dto.options as Record<string, unknown>;
    switch (key) {
      case 'name': opts.name = value; break;
      case 'ticker': opts.ticker = value; break;
      // Scala stores tags in a `Set[String]`, so duplicates collapse.
      case 'tags': opts.tags = [...new Set(value.split(',').map(s => s.trim()))]; break;
      default: opts[key] = value; break;
    }
  } else {
    throw new ParseError(`Option ${key} is not supported by ${p.kind}`);
  }
}

// ---- sort + merge (mirrors AccountCommand.sorted / mergedWith) --------------

function epochDay(date: string): number {
  if (date === MIN_DATE) return Number.MIN_SAFE_INTEGER / 100;
  return LocalDate.parse(date).toEpochDay();
}

// Scala validates the date inside each command's `parse` (via `LocalDate.parse`), turning a
// bad-but-well-formatted date (e.g. 2019-13-45) into a collected parser error. Mirror that
// so it doesn't instead surface as an uncaught throw later during sorting.
function isValidIsoDate(date: string): boolean {
  try {
    LocalDate.parse(date);
    return true;
  } catch {
    return false;
  }
}

function classValue(kind: Kind): number {
  switch (kind) {
    case 'global': return 0;
    case 'open': return 1;
    case 'adj': return 2;
    case 'bal': return 2;
    case 'unit': return 4;
    // A close consumes the day's income and expenses, so it must sort after everything else on it.
    case 'close': return 5;
    default: return 3;
  }
}

function orderValue(p: Parsed): number {
  // BalanceStatement orders on the underlying adjustment date (statement date + 1).
  const day = p.kind === 'bal' ? epochDay(p.dto.date) + 1 : epochDay(p.dto.date);
  return day * 10 + classValue(p.kind);
}

type Merge = 'concat' | 'replace' | 'conflict';

function sameKey(a: AccountCommandDTO, b: AccountCommandDTO): boolean {
  return a.date === b.date && a.accountId === b.accountId;
}

function dtoEquals(a: AccountCommandDTO, b: AccountCommandDTO): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// existing.mergedWith(incoming) — only `bal` and `unit` override the always-concat base.
function mergedWith(existing: Parsed, incoming: Parsed): Merge {
  if (existing.kind === 'bal') {
    if (incoming.kind === 'bal' && dtoEquals(existing.dto, incoming.dto)) return 'conflict';
    if (incoming.kind === 'unit' && sameKey(existing.dto, incoming.dto)
      && existing.dto.balance?.ccy === incoming.dto.balance?.ccy) return 'replace';
    if (incoming.kind === 'bal' && sameKey(existing.dto, incoming.dto)
      && existing.dto.balance?.ccy === incoming.dto.balance?.ccy) return 'replace';
    return 'concat';
  }
  if (existing.kind === 'unit') {
    if (incoming.kind === 'unit' && dtoEquals(existing.dto, incoming.dto)) return 'conflict';
    if (incoming.kind === 'unit' && sameKey(existing.dto, incoming.dto)
      && existing.dto.balance?.ccy === incoming.dto.balance?.ccy) return 'replace';
    if (incoming.kind === 'bal' && sameKey(existing.dto, incoming.dto)
      && existing.dto.balance?.ccy === incoming.dto.balance?.ccy) return 'replace';
    return 'concat';
  }
  return 'concat';
}

// ---- the parser ------------------------------------------------------------

export class GainstrackParser {
  private global: Parsed | null = null;
  private commands: Parsed[] = [];
  private errors: ParserMessage[] = [];
  private lineCount = 0;

  get parserErrors(): ParserMessage[] {
    return this.errors;
  }

  parseString(text: string): void {
    this.parseLines(text.split('\n'));
    if (this.errors.length > 0) {
      throw new Error(`There were ${this.errors.length} parsing errors`);
    }
  }

  parseLines(lines: Iterable<string>): void {
    for (const line of lines) this.tryParseLine(line);
  }

  private tryParseLine(fullLine: string): void {
    this.lineCount += 1;
    const line = fullLine.trim();

    const cmdMatch = ACCOUNT_COMMAND_RE.exec(line);
    if (cmdMatch) {
      const prefix = cmdMatch[2];
      const parser = COMMANDS[prefix];
      if (!parser) {
        this.pushError(`${prefix} is an unknown command`, line);
        return;
      }
      if (!isValidIsoDate(cmdMatch[1])) {
        this.pushError(`Invalid date: ${cmdMatch[1]}`, line);
        return;
      }
      try {
        const parsed = parser(line);
        this.checkForConflict(parsed);
        this.commands.push(parsed);
      } catch (e) {
        this.pushError(e instanceof Error ? e.message : String(e), line);
      }
      return;
    }

    const meta = METADATA_RE.exec(line);
    if (meta) {
      const last = this.commands[this.commands.length - 1];
      if (!last) {
        this.pushError(`Cannot apply ${meta[1]} to unknown command`, line);
        return;
      }
      try {
        applyOption(last, meta[1], meta[2]);
      } catch (e) {
        this.pushError(e instanceof Error ? e.message : String(e), line);
      }
      return;
    }

    const opt = OPTION_RE.exec(line);
    if (opt) {
      this.applyGlobalOption(opt[1], opt[2], line);
      return;
    }

    if (COMMENT_RE.test(line)) return; // comments are not represented in the DTO
    if (IGNORE_RE.test(line)) return;

    this.pushError(`Unparsable: ${line}`, line);
  }

  private applyGlobalOption(key: string, value: string, line: string): void {
    if (key !== 'operating_currency') {
      this.pushError(`Unknown global option: ${key}`, line);
      return;
    }
    if (value.toUpperCase() !== value) {
      // AssetId requires all-caps; Scala's `AssetId(value)` throws here.
      this.pushError(`Asset id must be all caps: ${value}`, line);
      return;
    }
    if (!this.global) {
      this.global = { kind: 'global', dto: { accountId: '', date: MIN_DATE, options: { operatingCurrency: value } } };
    } else {
      (this.global.dto.options as Record<string, unknown>).operatingCurrency = value;
    }
  }

  private checkForConflict(incoming: Parsed): void {
    const conflict = this.commands.find(existing => mergedWith(existing, incoming) !== 'concat');
    if (conflict) {
      throw new ParseError(
        `${this.toGainstrackHead(incoming)} conflicts with ${this.toGainstrackHead(conflict)}`,
      );
    }
  }

  private toGainstrackHead(p: Parsed): string {
    return `${p.dto.date} ${p.kind} ${p.dto.accountId}`;
  }

  private pushError(message: string, input: string): void {
    this.errors.push({ message, line: this.lineCount, input });
  }

  // [global?, ...commands] then AccountCommand.sorted.
  private sortedParsed(): Parsed[] {
    const all: Parsed[] = this.global ? [this.global, ...this.commands] : [...this.commands];
    const indexed = all.map((p, index) => ({ p, index, key: orderValue(p) }));
    indexed.sort((a, b) => (a.key - b.key) || (a.index - b.index));
    return indexed.map(({ p }) => p);
  }

  // Sorted commands as full toDTOs — the wire shape (`AllState.commands`).
  getCommands(): AccountCommandDTO[] {
    return this.sortedParsed().map(p => this.finalize(p));
  }

  // Sorted typed commands for the generator (retains full fidelity, e.g. tfr target ccy).
  getTypedCommands(): Parsed[] {
    return this.sortedParsed();
  }

  private finalize(p: Parsed): AccountCommandDTO {
    const commandType = p.kind === 'global' ? '' : p.kind;
    return { ...p.dto, commandType, description: describe(p) };
  }
}
