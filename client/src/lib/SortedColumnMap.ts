import {LocalDate} from '@js-joda/core';

export interface InterpolationOption {
  empty?: boolean
  exact?: number
  low?: number
  high?: number
  interpolate?: { before: { k: IntDate, v: number }, after: { k: IntDate, v: number } }
}

export class SortedColumnMap {
  ks: IntDate[];
  vs: number[];

  constructor(ks: IntDate[], vs: number[]) {
    this.ks = ks;
    this.vs = vs;
  }

  iota(key: IntDate): number {
    return this.ks.findIndex(k => key < k);
  }

  getNearest(key: IntDate): InterpolationOption {
    if (this.ks.length == 0) {
      return {empty: true};
    } else {
      const idx = this.iota(key);
      if (idx < 0) {
        return {high: this.vs[this.vs.length - 1]}
      } else if (this.ks[idx] == key) {
        return {exact: this.vs[idx]}
      } else if (idx == 0) {
        return {low: this.vs[0]}
      } else {
        return {
          interpolate: {
            before: {k: this.ks[idx - 1], v: this.vs[idx - 1]},
            after: {k: this.ks[idx], v: this.vs[idx]}
          }
        }
      }
    }
  }

  latestKey(key: IntDate): IntDate | undefined {
    const idx = this.iota(key)
    if (idx < 0) {
      return this.ks[this.ks.length - 1]
    } else if (idx == 0) {
      return this.ks[0] // Sort of shouldn't happen
    } else {
      return this.ks[idx]
    }
  }
}

export type IntDate = number

export function isoToIntDate(iso: string): IntDate {
  const bits = iso.split('-');
  return parseInt(bits[0]) * 10000 + parseInt(bits[1]) * 100 + parseInt(bits[2]);
}

export function localDateToIntDate(iso: LocalDate): IntDate {
  return iso.year() * 10000 + iso.monthValue() * 100 + iso.dayOfMonth();
}

export function fromIntDate(dt?: IntDate): LocalDate | undefined {
  if (dt) {
    const days = dt % 100;
    const monthLeft = (dt - days) / 100;
    const months = monthLeft % 100;
    const years = (monthLeft - months) / 100;
    return LocalDate.of(years, months, days);
  } else {
    return undefined;
  }
}

export function intDateToIsoDate(dt?: IntDate): LocalDate | undefined {
  return fromIntDate(dt)
}

export function linearInterpolateValue(int: { before: { k: IntDate; v: number }; after: { k: IntDate; v: number } }, key: IntDate) {
  const beforeDate = fromIntDate(int.before.k);
  const afterDate = fromIntDate(int.after.k);
  const keyDate = fromIntDate(key);
  if (keyDate && beforeDate && afterDate) {
    const all = beforeDate.until(afterDate).days();
    const n =  beforeDate.until(keyDate).days();
    const ratio = n / all;
    const diff = int.after.v - int.before.v;
    const ret = (diff * ratio) + int.before.v;
    return ret;
  } else {
    debugger; // Badly formatted date?
    return undefined;
  }
}

export type Interpolator = (nearest: InterpolationOption, key: IntDate) => number | undefined;
export const linear: Interpolator = (nearest: InterpolationOption, key: IntDate) => {
  if (nearest.empty) {
    return undefined;
  } else if (nearest.exact) {
    return nearest.exact
  } else if (nearest.low) {
    return nearest.low
  } else if (nearest.high) {
    return nearest.high
  } else if (nearest.interpolate) {
    const int = nearest.interpolate;
    return linearInterpolateValue(int, key);
  }
};
