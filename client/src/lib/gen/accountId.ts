// AccountId string helpers, ported from `core/.../core/AccountId.scala`. Account IDs are
// colon-delimited hierarchies (e.g. "Assets:Bank:USD"); the root is the empty string "".

const ACCOUNT_TYPES = new Set(['Assets', 'Liabilities', 'Equity', 'Income', 'Expenses']);

export const ROOT = '';

export function prefix(id: string): string {
  return id.split(':')[0];
}

export function shortName(id: string): string {
  const parts = id.split(':');
  return parts[parts.length - 1] ?? id;
}

/** Validates and returns the account-type prefix; mirrors AccountType(prefix). */
export function accountType(id: string): string {
  const p = prefix(id);
  if (p === '' || ACCOUNT_TYPES.has(p)) return p;
  throw new Error(`${p} is not an account type`);
}

export function parentAccountId(id: string): string | undefined {
  const idx = id.lastIndexOf(':');
  if (id === '') return undefined;
  if (idx > 0) return id.slice(0, idx);
  return ROOT;
}

export function subAccount(id: string, sub: string): string {
  return `${id}:${sub}`;
}

/** Replace the type prefix, e.g. convertType("Assets:Bank", "Income") -> "Income:Bank". */
export function convertType(id: string, aType: string): string {
  return id.replace(`${prefix(id)}:`, `${aType}:`);
}

export function convertTypeWithSubAccount(id: string, aType: string, sub: string): string {
  return `${convertType(id, aType)}:${sub}`;
}

export function isSubAccountOf(id: string, parentId: string): boolean {
  return id === parentId || id.startsWith(`${parentId}:`);
}
