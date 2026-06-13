// Ported from `core/.../core/Posting.scala`. A posting is one leg of a transaction.

import { Posting as DTOPosting } from 'src/lib/assetdb/models';
import { GAmount } from 'src/lib/gen/money';

// A posting that reaches toDTO always has a value (empty postings are interpolated away).

export class GPosting {
  constructor(
    readonly account: string,
    readonly value?: GAmount,
    readonly price?: GAmount,
    readonly cost?: GAmount,
  ) {}

  /** Cost basis (cost*value), else price*value, else value, else 0 USD. */
  get weight(): GAmount {
    if (this.cost && this.value) return this.cost.scale(this.value.number);
    if (this.price && this.value) return this.price.scale(this.value.number);
    if (this.value) return this.value;
    return GAmount.of(0, 'USD');
  }

  get isEmpty(): boolean {
    return this.value === undefined;
  }

  toDTO(): DTOPosting {
    const dto: DTOPosting = { account: this.account, value: this.value!.toDTO() };
    if (this.price) dto.price = this.price.toDTO();
    return dto;
  }
}

// Factory mirroring Posting.apply(account, value, price): a unit/same-ccy price collapses away.
export function posting(account: string, value: GAmount, price?: GAmount): GPosting {
  if (price && price.number.equals(1) && price.ccy === value.ccy) {
    return new GPosting(account, value);
  }
  return new GPosting(account, value, price);
}

export function postingWithCost(account: string, value: GAmount, cost: GAmount): GPosting {
  return new GPosting(account, value, undefined, cost);
}
