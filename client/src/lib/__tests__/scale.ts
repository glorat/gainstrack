/**
 * Normalize away trailing-zero scale in rendered numbers.
 *
 * Scala money is `BigDecimal`, which carries a scale: a literal written `5275.0` stays one-dp,
 * and `46111.55 - 46106.55` yields `5.00` because subtraction takes the max scale of its
 * operands. decimal.js has no scale — it normalizes to the shortest exact representation — so
 * the same values render as `5275` and `5`. The VALUES are identical; only trailing zeros
 * differ, and only in text that embeds a rendered number (transaction descriptions, beancount
 * lines). Reproducing BigDecimal scale would mean threading a scale through every arithmetic
 * operation in the money type — a large change to code whose numeric parity is already proven.
 *
 * Every spec that applies this must also bound it: assert that the raw difference is ONLY
 * trailing zeros, so a new class of divergence appearing in the same strings cannot hide here.
 */
export function stripScale(text: string): string {
  return text.replace(/-?\d+\.\d+/g, m => m.replace(/0+$/, '').replace(/\.$/, ''));
}
