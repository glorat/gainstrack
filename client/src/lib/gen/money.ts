// Internal money type for the generator port. Uses decimal.js so postings balance to exactly
// zero (faithful to the Scala `BigDecimal` money type), converting to plain JS `number` only at
// the AllState DTO boundary. Mirrors `core/.../core/Amount.scala`.

import Decimal from 'decimal.js';
import { Amount as DTOAmount } from 'src/lib/assetdb/models';

// Scala constructs BigDecimal with MathContext.DECIMAL128: 34 significant digits, HALF_EVEN.
Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_EVEN });

export type Num = Decimal;
export const D = (x: Decimal.Value): Decimal => new Decimal(x);
export const ZERO = new Decimal(0);

const ERR = 'Balance can only combine single currency';

/** A currency amount with exact (decimal.js) magnitude. */
export class GAmount {
  constructor(readonly number: Decimal, readonly ccy: string) {}

  static of(n: Decimal.Value, ccy: string): GAmount {
    return new GAmount(D(n), ccy);
  }

  private sameCcy(rhs: GAmount): void {
    if (rhs.ccy !== this.ccy) throw new Error(ERR);
  }

  add(rhs: GAmount): GAmount {
    this.sameCcy(rhs);
    return new GAmount(this.number.plus(rhs.number), this.ccy);
  }

  sub(rhs: GAmount): GAmount {
    this.sameCcy(rhs);
    return new GAmount(this.number.minus(rhs.number), this.ccy);
  }

  /** Scale by a scalar (Scala `Amount.*(Fraction)`). */
  scale(n: Decimal): GAmount {
    return new GAmount(this.number.times(n), this.ccy);
  }

  neg(): GAmount {
    return new GAmount(this.number.neg(), this.ccy);
  }

  get isZero(): boolean {
    return this.number.isZero();
  }

  equals(rhs: GAmount): boolean {
    return this.ccy === rhs.ccy && this.number.equals(rhs.number);
  }

  toDTO(): DTOAmount {
    return { number: this.number.toNumber(), ccy: this.ccy };
  }

  // beancount-style plain rendering, used only for `description` strings.
  toString(): string {
    return `${this.number.toFixed()} ${this.ccy}`;
  }
}
