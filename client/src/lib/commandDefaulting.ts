import {GlobalPricer} from 'src/lib/pricer';
import {isSubAccountOf, positionUnderAccount, postingsToPositionSet} from 'src/lib/utils';
import {LocalDate} from '@js-joda/core';
import {AccountCommandDTO, AssetDTO, AccountCommandEditing} from 'src/lib/assetdb/models';
import {AllStateEx} from 'src/lib/AllStateEx';


export function propDefined(props: Record<string, any>, name: string): boolean {
  // Avoid Object prototype pollution as a defensive measure
  return Object.prototype.hasOwnProperty.call(props, name)
}

// Typescript can't link the commandIsValid checks to the toGainstrack we we liberally use non-null-assertions
/* eslint-disable @typescript-eslint/no-non-null-assertion */
export function commandIsValid(c: AccountCommandEditing):boolean {
  if (c.commandType === 'bal')
    return !!c.accountId && !!c.date && !!c.balance && c.balance.number!==undefined && !!c.balance.ccy && !!c.otherAccount;
  else if (c.commandType === 'unit')
    return !!c.accountId && !!c.date && !!c.balance && c.balance.number!==undefined && !!c.balance.ccy && !!c.price?.ccy && !!c.price?.number;
  else if (c.commandType === 'commodity')
    return !!c.asset;
  else if (c.commandType === 'fund')
    return !!c.date
      && !!c.accountId
      && !!c.change
      && !!c.change.number
      && !!c.change.ccy
      && !!c.otherAccount;
  else if (c.commandType === 'tfr')
    return c.accountId
      && c.otherAccount
      && c.change
      && c.change.number
      && c.change.ccy
      && c.options
      && c.options.targetChange.number
      && c.options.targetChange.ccy;
  else if (c.commandType === 'yield')
    return !!c.accountId
      && !!c.change
      && !!c.change.number
      && !!c.change.ccy;
  else if (c.commandType === 'trade')
    return !!c.accountId
        && !!c.change
        && !!c.change.number
        && !!c.change.ccy
        && !!c.price
        && !!c.price.number
        && !!c.price.ccy;
  else
    return false; // Unsupported type for central checking

}

export function toGainstrack(c: AccountCommandDTO) {
  if (commandIsValid(c)) {
    if (c.commandType === 'bal') {
      return `${c.date} bal ${c.accountId} ${c.balance!.number} ${c.balance!.ccy} ${c.otherAccount}`;
    } else if (c.commandType === 'unit') {
      return `${c.date} unit ${c.accountId} ${c.balance!.number} ${c.balance!.ccy} @${c.price!.number} ${c.price!.ccy}`;
    } else if (c.commandType === 'commodity') {
      return toCommodityGainstrack(c)
    } else if (c.commandType === 'fund') {
      if (c.otherAccount) {
        return `${c.date} fund ${c.accountId} ${c.otherAccount} ${c.change!.number} ${c.change!.ccy}`;
      } else {
        return `${c.date} fund ${c.accountId} ${c.change!.number} ${c.change!.ccy}`;
      }
    } else if (c.commandType === 'tfr') {
      let baseStr = `${c.date} tfr ${c.accountId} ${c.otherAccount} ${c.change!.number} ${c.change!.ccy}`;
      if (c.change!.number !== c.options!.targetChange.number
        || c.change!.ccy !== c.options!.targetChange.ccy) {
        baseStr += ` ${c.options!.targetChange.number} ${c.options!.targetChange.ccy}`;
      }
      return baseStr;
    } else if (c.commandType === 'yield') {
      if (c.asset) { // FIXME: Use propDefined
        return `${c.date} yield ${c.accountId} ${c.asset} ${c.change!.number} ${c.change!.ccy}`;
      } else {
        return `${c.date} yield ${c.accountId} ${c.change!.number} ${c.change!.ccy}`
      }
    } else if (c.commandType === 'trade') {
      let baseStr = `${c.date} trade ${c.accountId} ${c.change!.number} ${c.change!.ccy} @${c.price!.number} ${c.price!.ccy}`;
      if (c.commission && c.commission.number && c.commission.ccy) {
        baseStr += ` C${c.commission.number} ${c.commission.ccy}`
      }
      return baseStr
    } else {
      throw new Error ('Unknown commandType')
    }

  } else {
    return '';
  }
}

export function toCommodityGainstrack(asset: AccountCommandDTO | AssetDTO) {
  let str = `1900-01-01 commodity ${asset.asset}`
  const options = asset.options || {};
  for (const [key, value] of Object.entries(options)) {
    if (key === 'tags' && Array.isArray(value) && value.length > 0) {
      str += `\n tags: ${value.join(',')}`
    } else if (value && !Array.isArray(value)) { // isScalar
      str += `\n  ${key}: ${value}`
    }
  }
  return str
}

export function defaultedCommand(c: AccountCommandDTO, stateEx: AllStateEx, fxConverter: GlobalPricer): AccountCommandDTO {
  if (c.commandType === 'trade') {
    return defaultedTradeCommand(c, stateEx, fxConverter)
  }
  else if (c.commandType?.match('unit|bal')) {
    return defaultedBalanceOrUnit(c, stateEx, fxConverter)
  } else {
    throw new Error(`${c.commandType} is an unknown command to default`)
  }
}

export function defaultedTradeCommand (c: AccountCommandDTO, stateEx: AllStateEx, fxConverter: GlobalPricer): AccountCommandDTO {
  const dc = {...c};
  const acct = stateEx.findAccount(dc.accountId);
  if (!dc.price) dc.price = {number: 0, ccy: ''};
  if (!dc.change) dc.change = {number: 0, ccy: ''};
  if (!dc.commission) dc.commission = {number: 0, ccy: ''};
  delete (dc.balance);

  if (!dc.price.ccy) {
    const underCcy = stateEx.underlyingCcy(dc.change.ccy, dc.accountId);
    if (underCcy) {
      dc.price = {
        ...dc.price,
        ccy: underCcy
      };
      if (!dc.commission.ccy) {
        dc.commission = {
          ...dc.commission,
          ccy: underCcy
        }
      }
    }
  }

  if (acct) {
    if (!dc.price.ccy) {
      dc.price = {
        ...dc.price,
        ccy: acct.ccy
      }
    }
    if (!dc.commission.ccy) {
      dc.commission = {
        ...dc.commission,
        ccy: acct.ccy
      }
    }
  }

  if (!dc.price.number && dc.price.ccy) {
    const date = LocalDate.parse(dc.date);
    const number = fxConverter.getFXTrimmed(dc.change.ccy, dc.price.ccy, date);
    if (number) {
      dc.price = {
        ...dc.price,
        number
      }
    }
  }
  return dc
}

export function defaultedBalanceOrUnit(c: AccountCommandEditing, stateEx: AllStateEx, fxConverter: GlobalPricer): AccountCommandDTO {
  const dc = {...c};
  delete dc.change;
  delete dc.commission;

  const acct = stateEx.findAccount(dc.accountId);
  if (!dc.date) dc.date = LocalDate.now().toString();

  if (dc.accountId && acct) {
    if (!dc.balance) {
      dc.balance = {ccy: acct.ccy, number: 0}
    }

    const ccy = dc.balance.ccy || acct.ccy;
    if (!dc.balance.ccy) {
      dc.balance = {...dc.balance, ccy: acct.ccy}
    }

    if (!dc.commandType || !/^(bal|unit)$/.test(dc.commandType)) {
      if (GlobalPricer.isIso(ccy) || dc.balance.ccy == acct.ccy) {
        dc.commandType = 'bal'
      } else {
        dc.commandType = 'unit'
      }
    }
    if (!dc.balance.number) {

      const pex = stateEx.allPostingsEx();
      // FIXME: Apply date on the filter
      const pos = positionUnderAccount(pex, dc.accountId);
      const number = GlobalPricer.trim(pos[ccy]) ?? 0;
      dc.balance = {...dc.balance, number}
    }

    const underCcy = stateEx.underlyingCcy(ccy, dc.accountId) ?? acct.ccy;
    if (!dc.price) {
      dc.price = {ccy: acct.ccy, number: 0} // Does this ever happen?
    }
    if (!dc.price.ccy && !dc.price.number && underCcy) {

      const dt = LocalDate.parse(dc.date);
      const priceNumber = fxConverter.getFXTrimmed(ccy, underCcy, dt) ?? 0;

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
  return dc as AccountCommandDTO;
}


function inferredYieldCcy(dc: AccountCommandEditing, stateEx: AllStateEx):string {

  const asset = dc.asset;

  const acct = stateEx.findAccount(dc.accountId);
  if (acct && acct.options.multiAsset && asset) {
    const cmds = stateEx.state.commands;
    const prev = cmds.reverse().find(cmd => cmd.commandType === 'yield' && cmd.asset === asset);
    if (prev && prev.change) {
      return prev.change.ccy
    } else {
      const under = stateEx.underlyingCcy(asset, dc.accountId);
      if (under) return under;
    }
  }

  if (acct && acct.options.fundingAccount) {
    const fundAcct = stateEx.findAccount(acct.options.fundingAccount);
    if (fundAcct) {
      // TODO: A test case would show that the PP account would yield GBP
      return fundAcct.ccy;
    }
  } else if (acct) {
    // TODO: A test case would show that a GBP savings account would yield GBP
    return acct.ccy;
  }
  // Nothing
  return '';
}

export function defaultedYieldCommand(c: AccountCommandEditing, stateEx: AllStateEx) {
  const dc = {...c};
  const acct = stateEx.findAccount(dc.accountId);
  if (dc.change && !dc.change.ccy) {
    const changeCcy = inferredYieldCcy(dc, stateEx);
    dc.change = {...dc.change, ccy: changeCcy};
  }
  if (acct) {
    if (acct.options.multiAsset) {
      dc.asset = dc.asset || acct.ccy
    } else {
      dc.asset = ''
    }
  }
  return dc;
}

export function defaultedTransferCommand(c: AccountCommandEditing, stateEx: AllStateEx, fxConverter: GlobalPricer) {
  const dc = {...c};
  if (!dc.date) dc.date = LocalDate.now().toString();
  const acct = stateEx.findAccount(dc.accountId);
  if (!dc.change) dc.change = {number:undefined, ccy: undefined};
  if (acct) {
    if (!dc.change.ccy) dc.change = {...dc.change, ccy: acct.ccy}
  }

  const other = stateEx.findAccount(dc.otherAccount);

  if (!dc.options || !dc.options.targetChange) {
    dc.options = {targetChange: {number: 0, ccy: ''}};
  }

  if (other?.accountId) {
    if (!dc.options.targetChange.ccy) dc.options.targetChange = {...dc.options.targetChange, ccy: other.ccy}
  }  else if (acct && acct.options.multiAsset) {
    // Default to yourself if you are transferring from a multi-asset account
    dc.otherAccount = acct.accountId;
  }

  if (!dc.options.targetChange.number && dc.change.ccy && dc.change.number) {
    const dt = LocalDate.parse(dc.date);
    const fx = fxConverter.getFXTrimmed(dc.change.ccy, dc.options.targetChange.ccy, dt);
    const number = (fx??0) * dc.change.number;
    dc.options.targetChange = {...dc.options.targetChange, number}
  }
  return dc;
}

export function defaultedFundCommand(c: AccountCommandEditing, stateEx: AllStateEx) {
  const dc = {...c};
  const acct = stateEx.findAccount(dc.accountId);
  if (!dc.change) dc.change = {number:0, ccy: ''};
  if (acct) {
    if (!dc.change.ccy) dc.change = {...dc.change, ccy: acct.ccy}
  }
  if (!dc.otherAccount) {
    if (acct) {
      dc.otherAccount = acct.options.fundingAccount;
    } else {
      dc.otherAccount = 'Equity:Opening'; // Un-hardcode???
    }
  }
  return dc;
}

export function canConvertToTrade(c: AccountCommandDTO, stateEx: AllStateEx, fxConverter: GlobalPricer):boolean {

  const dc = defaultedCommand(c, stateEx, fxConverter);
  if (dc.commandType !== 'unit') return false;
  // FIXME: more checks
  return true;
}

export function convertToTrade (c: AccountCommandDTO, stateEx: AllStateEx, fxConverter: GlobalPricer): AccountCommandDTO {
  const dc = defaultedCommand(c, stateEx, fxConverter);

  const accountId = dc.accountId;
  const dateAfter = LocalDate.parse(dc.date);

  const pex = stateEx.allPostingsEx()
      .filter(p => isSubAccountOf(p.account, accountId))
      .filter(p => dateAfter.isAfter(LocalDate.parse(p.date)));
  const pSet = postingsToPositionSet(pex);

  const balance = dc.balance!;
  const currentBalance = pSet[balance.ccy];
  const changeBalance = balance.number - currentBalance;
  const newc = { ...c };
  newc.change = {
    number: changeBalance,
    ccy: balance.ccy
  };
  newc.commandType = 'trade';
  return newc
}
