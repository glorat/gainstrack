import {GlobalPricer} from 'src/lib/pricer';
import {positionUnderAccount} from 'src/lib/utils';
import {LocalDate} from '@js-joda/core';
import {AccountCommandDTO} from 'src/lib/models';
import {AllStateEx} from 'src/lib/AllStateEx';

// Typescript can't link the commandIsValid checks to the toGainstrack we we liberally use non-null-assertions
/* eslint-disable @typescript-eslint/no-non-null-assertion */
export function commandIsValid(c: AccountCommandDTO):boolean {
  if (c.commandType === 'bal')
    return !!c.accountId && !!c.date && !!c.balance && c.balance.number!==undefined && !!c.balance.ccy && !!c.otherAccount;
  else if (c.commandType === 'unit')
    return !!c.accountId && !!c.date && !!c.balance && c.balance.number!==undefined && !!c.balance.ccy && !!c.price?.ccy && !!c.price?.number;
  else
    return false; // Unsupported type for central checking

}

function balValid(c: AccountCommandDTO): boolean {
  return !!c.accountId && !!c.date && !!c.balance && c.balance.number!==undefined && !!c.balance.ccy && !!c.otherAccount;
}


export function toGainstrack(c: AccountCommandDTO) {
  if (commandIsValid(c)) {
    if (c.commandType === 'bal' && balValid(c)) {
      return `${c.date} bal ${c.accountId} ${c.balance!.number} ${c.balance!.ccy} ${c.otherAccount}`;
    } else if (c.commandType === 'unit') {
      return `${c.date} unit ${c.accountId} ${c.balance!.number} ${c.balance!.ccy} @${c.price!.number} ${c.price!.ccy}`;
    } else {
      throw new Error ('Unknown commandType')
    }

  } else {
    return '';
  }

}

export function defaultedBalanceOrUnit(c: AccountCommandDTO, stateEx: AllStateEx, fxConverter: GlobalPricer): AccountCommandDTO {
  const dc = {...c};
  const acct = stateEx.findAccount(dc.accountId);


  if (acct) {
    if (!dc.balance) {
      dc.balance = {ccy: acct.ccy, number: 0}
    }
    if (!dc.balance.ccy) {
      dc.balance = {...dc.balance, ccy: acct.ccy}
    }

    if (!dc.commandType || !/^(bal|unit)$/.test(dc.commandType)) {
      if (GlobalPricer.isIso(dc.balance.ccy) || dc.balance.ccy == acct.ccy) {
        dc.commandType = 'bal'
      } else {
        dc.commandType = 'unit'
      }
    }
    if (!dc.balance.number) {

      const pex = stateEx.allPostingsEx();
      const pos = positionUnderAccount(pex, dc.accountId);
      const number = GlobalPricer.trim(pos[dc.balance.ccy]) ?? 0;
      dc.balance = {...dc.balance, number}
    }

    const underCcy = stateEx.underlyingCcy(dc.balance.ccy, dc.accountId);
    if (!dc.price) {
      dc.price = {ccy: acct.ccy, number: 0} // Does this ever happen?
    }
    if (!dc.price.ccy && !dc.price.number && underCcy) {

      const dt = LocalDate.parse(dc.date);
      const priceNumber = fxConverter.getFXTrimmed(dc.balance.ccy, underCcy, dt) ?? 0;

      dc.price = {ccy: underCcy, number: priceNumber};
    }

    if (dc.commandType === 'bal' && !dc.otherAccount) {
      const allCmds = [...stateEx.state.commands].reverse();
      const prev = allCmds.find(
        x => x.accountId === dc.accountId && x.commandType === 'bal');
      if (prev) {
        dc.otherAccount = prev.otherAccount;
      } else {
        dc.otherAccount = 'Equity:Opening'
      }
    }

    if (!dc.commandType) {
      dc.commandType = 'bal';
    }

  }
  return dc;
}
